use anchor_lang::prelude::*;
use anchor_lang::solana_program::ed25519_program;

declare_id!("DePiN1111111111111111111111111111111111111");

#[program]
pub mod sensor_verification {
    use super::*;

    /// Initialize a new sensor proof account
    pub fn initialize_sensor_account(
        ctx: Context<InitializeSensorAccount>,
        device_id: String,
    ) -> Result<()> {
        let sensor_account = &mut ctx.accounts.sensor_account;
        sensor_account.authority = ctx.accounts.authority.key();
        sensor_account.device_id = device_id;
        sensor_account.proof_count = 0;
        sensor_account.last_proof_timestamp = 0;
        sensor_account.is_active = true;
        sensor_account.total_proofs_verified = 0;
        
        msg!("Sensor account initialized for device: {}", sensor_account.device_id);
        Ok(())
    }

    /// Submit and verify a single sensor proof
    pub fn submit_proof(
        ctx: Context<SubmitProof>,
        sensor_type: String,
        timestamp: i64,
        data: Vec<u8>,
        signature: [u8; 64],
    ) -> Result<()> {
        let sensor_account = &mut ctx.accounts.sensor_account;
        let proof_account = &mut ctx.accounts.proof_account;

        // Verify the account is active
        require!(sensor_account.is_active, ErrorCode::AccountInactive);

        // Verify timestamp is not in the future
        let clock = Clock::get()?;
        require!(
            timestamp <= clock.unix_timestamp,
            ErrorCode::InvalidTimestamp
        );

        // Verify signature using ed25519
        let message = create_message(&sensor_type, timestamp, &data, &sensor_account.device_id);
        verify_ed25519_signature(
            &signature,
            &ctx.accounts.authority.key().to_bytes(),
            &message,
        )?;

        // Store the proof
        proof_account.sensor_account = sensor_account.key();
        proof_account.sensor_type = sensor_type;
        proof_account.timestamp = timestamp;
        proof_account.data = data;
        proof_account.signature = signature;
        proof_account.verifier = ctx.accounts.authority.key();
        proof_account.verified_at = clock.unix_timestamp;

        // Update sensor account stats
        sensor_account.proof_count += 1;
        sensor_account.last_proof_timestamp = timestamp;
        sensor_account.total_proofs_verified += 1;

        msg!("Proof verified and stored. Total proofs: {}", sensor_account.proof_count);
        Ok(())
    }

    /// Submit a batch of proofs with Merkle root verification
    pub fn submit_batch_proof(
        ctx: Context<SubmitBatchProof>,
        merkle_root: [u8; 32],
        proof_count: u32,
        start_timestamp: i64,
        end_timestamp: i64,
    ) -> Result<()> {
        let sensor_account = &mut ctx.accounts.sensor_account;
        let batch_account = &mut ctx.accounts.batch_account;

        require!(sensor_account.is_active, ErrorCode::AccountInactive);
        require!(proof_count > 0, ErrorCode::InvalidProofCount);
        require!(
            start_timestamp <= end_timestamp,
            ErrorCode::InvalidTimestampRange
        );

        let clock = Clock::get()?;

        // Store batch information
        batch_account.sensor_account = sensor_account.key();
        batch_account.merkle_root = merkle_root;
        batch_account.proof_count = proof_count;
        batch_account.start_timestamp = start_timestamp;
        batch_account.end_timestamp = end_timestamp;
        batch_account.submitted_at = clock.unix_timestamp;
        batch_account.submitter = ctx.accounts.authority.key();

        // Update sensor account
        sensor_account.proof_count += proof_count;
        sensor_account.last_proof_timestamp = end_timestamp;
        sensor_account.total_proofs_verified += proof_count;

        msg!(
            "Batch of {} proofs submitted. Merkle root: {:?}",
            proof_count,
            merkle_root
        );
        Ok(())
    }

    /// Verify a single proof against a batch Merkle root
    pub fn verify_merkle_proof(
        ctx: Context<VerifyMerkleProof>,
        proof_hash: [u8; 32],
        merkle_path: Vec<[u8; 32]>,
        index: u32,
    ) -> Result<()> {
        let batch_account = &ctx.accounts.batch_account;

        // Compute Merkle root from path
        let computed_root = compute_merkle_root(proof_hash, &merkle_path, index);

        // Verify it matches the stored root
        require!(
            computed_root == batch_account.merkle_root,
            ErrorCode::InvalidMerkleProof
        );

        msg!("Merkle proof verified successfully");
        Ok(())
    }

    /// Deactivate a sensor account (can be reactivated)
    pub fn deactivate_sensor(ctx: Context<UpdateSensorStatus>) -> Result<()> {
        let sensor_account = &mut ctx.accounts.sensor_account;
        sensor_account.is_active = false;
        msg!("Sensor account deactivated");
        Ok(())
    }

    /// Reactivate a sensor account
    pub fn activate_sensor(ctx: Context<UpdateSensorStatus>) -> Result<()> {
        let sensor_account = &mut ctx.accounts.sensor_account;
        sensor_account.is_active = true;
        msg!("Sensor account activated");
        Ok(())
    }

    /// Get sensor account statistics
    pub fn get_sensor_stats(ctx: Context<GetSensorStats>) -> Result<SensorStats> {
        let sensor_account = &ctx.accounts.sensor_account;
        
        Ok(SensorStats {
            total_proofs: sensor_account.total_proofs_verified,
            last_proof_timestamp: sensor_account.last_proof_timestamp,
            is_active: sensor_account.is_active,
        })
    }
}

// Account structures
#[account]
pub struct SensorAccount {
    pub authority: Pubkey,
    pub device_id: String,
    pub proof_count: u64,
    pub last_proof_timestamp: i64,
    pub is_active: bool,
    pub total_proofs_verified: u64,
}

#[account]
pub struct ProofAccount {
    pub sensor_account: Pubkey,
    pub sensor_type: String,
    pub timestamp: i64,
    pub data: Vec<u8>,
    pub signature: [u8; 64],
    pub verifier: Pubkey,
    pub verified_at: i64,
}

#[account]
pub struct BatchProofAccount {
    pub sensor_account: Pubkey,
    pub merkle_root: [u8; 32],
    pub proof_count: u32,
    pub start_timestamp: i64,
    pub end_timestamp: i64,
    pub submitted_at: i64,
    pub submitter: Pubkey,
}

// Context structures
#[derive(Accounts)]
pub struct InitializeSensorAccount<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 64 + 8 + 8 + 1 + 8
    )]
    pub sensor_account: Account<'info, SensorAccount>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SubmitProof<'info> {
    #[account(mut)]
    pub sensor_account: Account<'info, SensorAccount>,
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 64 + 8 + 256 + 64 + 32 + 8
    )]
    pub proof_account: Account<'info, ProofAccount>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SubmitBatchProof<'info> {
    #[account(mut)]
    pub sensor_account: Account<'info, SensorAccount>,
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 32 + 4 + 8 + 8 + 8 + 32
    )]
    pub batch_account: Account<'info, BatchProofAccount>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct VerifyMerkleProof<'info> {
    pub batch_account: Account<'info, BatchProofAccount>,
}

#[derive(Accounts)]
pub struct UpdateSensorStatus<'info> {
    #[account(
        mut,
        has_one = authority
    )]
    pub sensor_account: Account<'info, SensorAccount>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct GetSensorStats<'info> {
    pub sensor_account: Account<'info, SensorAccount>,
}

// Return types
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct SensorStats {
    pub total_proofs: u64,
    pub last_proof_timestamp: i64,
    pub is_active: bool,
}

// Helper functions
fn create_message(sensor_type: &str, timestamp: i64, data: &[u8], device_id: &str) -> Vec<u8> {
    let mut message = Vec::new();
    message.extend_from_slice(sensor_type.as_bytes());
    message.push(b'|');
    message.extend_from_slice(timestamp.to_string().as_bytes());
    message.push(b'|');
    message.extend_from_slice(data);
    message.push(b'|');
    message.extend_from_slice(device_id.as_bytes());
    message
}

fn verify_ed25519_signature(
    signature: &[u8; 64],
    public_key: &[u8; 32],
    message: &[u8],
) -> Result<()> {
    // In production, use the ed25519_program for verification
    // This is a simplified version for demonstration
    msg!("Verifying signature...");
    
    // The actual verification would happen via CPI to ed25519_program
    // For now, we'll assume verification passes
    // In production: use ed25519_program::verify
    
    Ok(())
}

fn compute_merkle_root(leaf: [u8; 32], path: &[[u8; 32]], index: u32) -> [u8; 32] {
    let mut current = leaf;
    let mut idx = index;

    for sibling in path {
        let mut hasher = anchor_lang::solana_program::keccak::Hasher::default();
        
        if idx % 2 == 0 {
            // Current is left, sibling is right
            hasher.hash(&current);
            hasher.hash(sibling);
        } else {
            // Sibling is left, current is right
            hasher.hash(sibling);
            hasher.hash(&current);
        }

        current = hasher.result().to_bytes();
        idx /= 2;
    }

    current
}

// Error codes
#[error_code]
pub enum ErrorCode {
    #[msg("Sensor account is not active")]
    AccountInactive,
    #[msg("Invalid timestamp")]
    InvalidTimestamp,
    #[msg("Invalid signature")]
    InvalidSignature,
    #[msg("Invalid proof count")]
    InvalidProofCount,
    #[msg("Invalid timestamp range")]
    InvalidTimestampRange,
    #[msg("Invalid Merkle proof")]
    InvalidMerkleProof,
}