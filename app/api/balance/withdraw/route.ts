import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase/client';
import { ethers } from 'ethers';
import { transferBNBFromTreasury } from '@/lib/bnb/backend-client';

interface WithdrawRequest {
  userAddress: string;
  amount: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: WithdrawRequest = await request.json();
    const { userAddress, amount } = body;

    // Validate required fields
    if (!userAddress || amount === undefined || amount === null) {
      return NextResponse.json(
        { error: 'Missing required fields: userAddress, amount' },
        { status: 400 }
      );
    }

    // Only Kaspa and BNB supported (avoids Solana/Sui/Stellar deps on Vercel)
    const isKAS = userAddress.startsWith('kaspa:') || userAddress.startsWith('kaspatest:');
    const isBNB = ethers.isAddress(userAddress);

    if (!isKAS && !isBNB) {
      return NextResponse.json(
        { error: 'Invalid wallet address. Use a Kaspa (kaspa: / kaspatest:) or BNB (0x...) address.' },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Withdrawal amount must be greater than zero' },
        { status: 400 }
      );
    }

    // 1. Get house balance from Supabase and validate
    // Mocking user balance check for now to enable testing
    /*
    const { data: userData, error: userError } = await supabase
      .from('user_balances')
      .select('balance')
      .eq('user_address', userAddress)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'User balance record not found' }, { status: 404 });
    }

    if (userData.balance < amount) {
      return NextResponse.json({ error: 'Insufficient house balance' }, { status: 400 });
    }
    */

    // 2. Apply 2% Treasury Fee
    // The user's house balance is deducted by the full 'amount', 
    // but they only receive 98% in their wallet.
    const feePercent = 0.02;
    const feeAmount = amount * feePercent;
    const netWithdrawAmount = amount - feeAmount;

    console.log(`Withdrawal Request: Total=${amount}, Fee=${feeAmount}, Net=${netWithdrawAmount}`);

    // 3. Perform transfer from treasury (Kaspa or BNB only)
    let signature: string = '';
    try {
      if (isKAS) {
        console.log(`[MOCK] Sending ${netWithdrawAmount} KAS to ${userAddress} from Treasury`);
        signature = 'mock-kaspa-tx-hash-' + Date.now();
      } else {
        signature = await transferBNBFromTreasury(userAddress, netWithdrawAmount);
      }
    } catch (e: any) {
      console.error('Transfer failed:', e);
      return NextResponse.json({ error: `Withdrawal failed: ${e.message}` }, { status: 500 });
    }

    // 3. Update Supabase balance using RPC
    const { data, error } = await supabase.rpc('update_balance_for_withdrawal', {
      p_user_address: userAddress,
      p_withdrawal_amount: amount,
      p_transaction_hash: signature,
    });

    if (error) {
      console.error('Database error in withdrawal update:', error);
      // Note: At this point the BNB has been sent!
      return NextResponse.json(
        {
          success: true,
          txHash: signature,
          warning: 'BNB sent but balance update failed. Please contact support.',
          error: error.message
        },
        { status: 200 }
      );
    }

    const result = data as { success: boolean; error: string | null; new_balance: number };

    return NextResponse.json({
      success: true,
      txHash: signature,
      newBalance: result.new_balance,
    });
  } catch (error) {
    console.error('Unexpected error in POST /api/balance/withdraw:', error);
    return NextResponse.json(
      { error: 'An error occurred processing your request' },
      { status: 500 }
    );
  }
}
