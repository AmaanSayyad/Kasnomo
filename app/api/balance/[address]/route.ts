/**
 * GET /api/balance/[address] endpoint
 * 
 * Task: 4.1 Create GET /api/balance/[address] endpoint
 * Requirements: 2.3
 * 
 * Returns the current house balance for a user address.
 * Handles user not found by returning 0 balance.
 * Includes error handling for database errors.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase/client';
import { ethers } from 'ethers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    // Await params in Next.js 15+
    const { address } = await params;

    // Validate address (support BNB, Solana, and Sui)
    let isValid = false;

    // Check if it's a valid Kaspa address
    if (address.startsWith('kaspa:') || address.startsWith('kaspatest:')) {
      isValid = true;
    }
    // Check if it's a valid EVM address (BNB)
    else if (ethers.isAddress(address)) {
      isValid = true;
      // Check if it's a valid Sui address (Legacy - Optional)
      if (/^0x[0-9a-fA-F]{64}$/.test(address)) {
        isValid = true;
      }

      // Removed Solana/Stellar checks as project is Kaspa focused
    }

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid wallet address format (Kaspa, EVM, Solana, Sui or Stellar required)' },
        { status: 400 }
      );
    }

    // Query user_balances table by user_address
    const { data, error } = await supabase
      .from('user_balances')
      .select('balance, updated_at')
      .eq('user_address', address)
      .single();

    // Handle database errors
    if (error) {
      // If user not found (PGRST116), return 0 balance
      if (error.code === 'PGRST116') {
        return NextResponse.json({
          balance: 0,
          updatedAt: null,
          tier: 'free'
        });
      }

      // Log other database errors
      console.error(`Database error fetching balance for ${address}:`, JSON.stringify(error, null, 2));
      return NextResponse.json(
        { error: 'Service temporarily unavailable: ' + (error.message || error.code) },
        { status: 503 }
      );
    }

    // Return balance and updated_at timestamp
    return NextResponse.json({
      balance: parseFloat(data.balance),
      updatedAt: data.updated_at,
      tier: 'free'
    });
  } catch (error) {
    // Handle unexpected errors
    console.error('Unexpected error in GET /api/balance/[address]:', error);
    return NextResponse.json(
      { error: 'An error occurred processing your request' },
      { status: 500 }
    );
  }
}
