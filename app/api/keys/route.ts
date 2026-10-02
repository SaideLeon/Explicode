import { NextRequest, NextResponse } from 'next/server';
import {
  getPublicKeyPoolStatus,
  updateKeyStatusByMask,
  reactivateAllCooldownKeys,
} from '@/lib/geminiService';

export async function GET() {
  const keys = getPublicKeyPoolStatus();
  return NextResponse.json({
    success: true,
    keys,
    timestamp: Date.now(),
  });
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body?.action as
      | 'activate'
      | 'disable'
      | 'remove'
      | 'activate_all_cooldown';

    if (action === 'activate_all_cooldown') {
      const keys = reactivateAllCooldownKeys();
      return NextResponse.json({
        success: true,
        keys,
        timestamp: Date.now(),
      });
    }

    const keyMask = typeof body?.keyMask === 'string' ? body.keyMask.trim() : '';
    if (!keyMask || !['activate', 'disable', 'remove'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Parâmetros inválidos.' },
        { status: 400 }
      );
    }
    const keys = updateKeyStatusByMask(keyMask, action);
    return NextResponse.json({
      success: true,
      keys,
      timestamp: Date.now(),
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Erro ao atualizar estado da chave.' },
      { status: 400 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const keyMask = searchParams.get('keyMask') || '';
    if (!keyMask) {
      return NextResponse.json(
        { success: false, error: 'Informe keyMask para remover.' },
        { status: 400 }
      );
    }
    const keys = updateKeyStatusByMask(keyMask, 'remove');
    return NextResponse.json({
      success: true,
      keys,
      timestamp: Date.now(),
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Erro ao remover chave.' },
      { status: 400 }
    );
  }
}
