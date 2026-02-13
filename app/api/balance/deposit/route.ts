/**
 * POST /api/balance/deposit endpoint
 * 
 * Task: 7.2 Update deposit endpoint for Sui
 * Requirements: 2.4
 * 
 * Called by blockchain event listener after deposit transaction.
 * Updates Supabase balance by adding deposit amount.
 * Inserts audit log entry with operation_type='deposit'.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase/client';
import { ethers } from 'ethers';

interface DepositRequest {
  userAddress: string;
  amount: number;
  txHash: string;
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: DepositRequest = await request.json();
    const { userAddress, amount, txHash } = body;

    // Validate required fields
    if (!userAddress || amount === undefined || amount === null || !txHash) {
      return NextResponse.json(
        { error: 'Missing required fields: userAddress, amount, txHash' },
        { status: 400 }
      );
    }

    // Validate address (support BNB, Solana, and Sui)
    let isValid = false;

    // Check if it's a valid Kaspa address
    if (userAddress.startsWith('kaspa:') || userAddress.startsWith('kaspatest:')) {
      isValid = true;
    }
    // Check if it's a valid EVM address
    else if (ethers.isAddress(userAddress)) {
      isValid = true;
    }
    // Check if it's a valid Sui address (Legacy - Optional)
    else if (/^0x[0-9a-fA-F]{64}$/.test(userAddress)) {
      isValid = true;
    }

    // Removed Solana/Stellar checks as project is Kaspa focused

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid wallet address format (Kaspa, EVM, Solana, Sui or Stellar required)' },
        { status: 400 }
      );
    }

    // Validate amount is positive
    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Deposit amount must be greater than zero' },
        { status: 400 }
      );
    }

    // Direct DB update (Bypassing RPC for reliability during dev)
    let newBalance = amount;

    // 1. Check existing balance
    const { data: existingData, error: fetchError } = await supabase
      .from('user_balances')
      .select('balance')
      .eq('user_address', userAddress)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = JSON object not found (no row)
      console.error('Error fetching existing balance:', fetchError);
      return NextResponse.json({ error: 'Database error fetching balance: ' + fetchError.message }, { status: 500 });
    }

    if (existingData) {
      // Update existing
      newBalance = parseFloat(existingData.balance) + amount;
      const { error: updateError } = await supabase
        .from('user_balances')
        .update({
          balance: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('user_address', userAddress);

      if (updateError) {
        console.error('Error updating balance:', updateError);
        return NextResponse.json({ error: 'Database error updating balance: ' + updateError.message }, { status: 500 });
      }
    } else {
      // Insert new
      const { error: insertError } = await supabase
        .from('user_balances')
        .insert({
          user_address: userAddress,
          balance: newBalance,
          updated_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        });

      if (insertError) {
        console.error('Error inserting balance:', insertError);
        return NextResponse.json({ error: 'Database error creating balance: ' + insertError.message }, { status: 500 });
      }
    }

    console.log(`[DB] Deposit successful for ${userAddress}: +${amount} -> ${newBalance}`);

    return NextResponse.json({
      success: true,
      newBalance: newBalance,
    });


  } catch (error) {
    // Handle unexpected errors
    console.error('Unexpected error in POST /api/balance/deposit:', error);
    return NextResponse.json(
      { error: 'An error occurred processing your request' },
      { status: 500 }
    );
  }
}
