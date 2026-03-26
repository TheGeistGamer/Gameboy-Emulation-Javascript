import { MMU } from './MMU';

export const z80 = {
  // Time clock: The z80 holds two types of clock (m and t)
  _clock: { m: 0, t: 0 },
  _halt: 0,       // pause
  _stop: 0,       // stopped strong

  _r: {
    a: 0, b: 0, c: 0, d: 0, e: 0, h: 0, l: 0, f: 0,       // 8-bit registers
    pc: 0, sp: 0, i: 0, r: 0,                             // 16-bit registers
    m: 0, t: 0,                                           // Clock for last instr
    ime: 0,
  },

  // - i → inputs
  // - r → refresh
  // - m → machine cycles
  // - ime → interrupt master enable
  // - t → clock ticks
  // - pc (program counter) → “the next instruction to execute”
  // - sp (stack pointer)

  // Add E to A, leaving result in A (ADD A, E)
  ADDr_e: function () {
    z80._r.a += z80._r.e;                     // Perform addition
    z80._r.f = 0;                             // Clear flags
    if (!(z80._r.a & 255)) z80._r.f |= 0x80   // Check for zero
    if (z80._r.a > 255) z80._r.f |= 0x10      // Check for carry
    z80._r.a &= 255;                          // Mask to 8-bits
    z80._r.m = 1; z80._r.t = 4;               // 1 M-time taken   
  },

  // Compare B to A, setting flags (CP A, B)
  CPr_b: function () {
    let i = z80._r.a;                         // Temp copy of A
    i -= z80._r.b;                            // Substract B
    z80._r.f |= 0x40;                         // Set substraction flags
    if (!(i & 255)) z80._r.f |= 0x80;         // Check for zero
    if (!(i < 0)) z80._r.f |= 0x10;           // Check for underflow
    z80._r.m = 1; z80._r.t = 4;               // 1 M-time taken
  },

  // No-operation (NOP)

  // m = machine cycles
  // t = clock ticks
  NOP: function () {
    z80._r.m = 1; z80._r.t = 4;               // 1 M-time taken
  },

  // ---  Memory-handling instructions ---
  // Push registers B and C to the stack (PUSH BC)
  PUSHBC: function () {
    z80._r.sp--;                              // Drop through th stack
    MMU.wb(z80._r.sp, z80._r.b);              // Write B
    z80._r.sp--;                              // Drop through the stack
    MMU.wb(z80._r.sp, z80._r.c);              // Write C
    z80._r.m = 3; z80._r.t = 12;              // 3 M-times taken
  },

  // Pop registers H and L off the stack (POP HL)
  POPHL: function () {
    z80._r.l = MMU.rb(z80._r.sp);             // Read L
    z80._r.sp++;                              // Move back up the stack
    z80._r.h = MMU.rb(z80._r.sp);             // Read H
    z80._r.sp++;                              // Move back up the stack
    z80._r.m = 3; z80._r.t = 12;              // 3 M-tiems taken
  },

  // Read a byte from absolute location into A (LD A, addr)
  LDAmm: function () {
    let addr = MMU.rw(z80._r.pc);             // Get address form instr
    z80._r.pc += 2;                           // Advance PC
    z80._r.a = MMU.rb(addr);                  // Read from address
    z80._r.m = 4; z80._r.t = 16;                // 4 M-times taken
  },

  // --- Dispatch and reset ---
  rest: function () {
    z80._r.a = 0; z80._r.b = 0; z80._r.c = 0; z80._r.d = 0;
    z80._r.e = 0; z80._r.h = 0; z80._r.l = 0; z80._r.f = 0;
    z80._r.sp = 0;
    z80._r.pc = 0;    // Start execution at 0

    z80._clock.m = 0; z80._clock.t = 0;
  },

  exec: function () {
    z80._r.r = (z80._r.r + 1) & 127;
    z80._map[MMU.rb(z80._r.pc++)]();
    z80._r.pc &= 65535;
    z80._clock.m += z80._r.m; z80._clock.t += z80._r.t;
    if (MMU_inbios && z80._r.pc == 0x0100) MMU._inbios = 0;
  },

  // LD r, r  (register to register)
  _ops: {
    /*--- Load/store ---*/
    LDrr_bb: function () { z80._r.b = z80._r.b; z80._r.m = 1; z80._r.t = 4; },
    LDrr_bc: function () { z80._r.b = z80._r.c; z80._r.m = 1; z80._r.t = 4; },
    LDrr_bd: function () { z80._r.b = z80._r.d; z80._r.m = 1; z80._r.t = 4; },
    LDrr_be: function () { z80._r.b = z80._r.e; z80._r.m = 1; z80._r.t = 4; },
    LDrr_bh: function () { z80._r.b = z80._r.h; z80._r.m = 1; z80._r.t = 4; },
    LDrr_bl: function () { z80._r.b = z80._r.l; z80._r.m = 1; z80._r.t = 4; },
    LDrr_ba: function () { z80._r.b = z80._r.a; z80._r.m = 1; z80._r.t = 4; },
    LDrr_cb: function () { z80._r.c = z80._r.b; z80._r.m = 1; z80._r.t = 4; },
    LDrr_cc: function () { z80._r.c = z80._r.c; z80._r.m = 1; z80._r.t = 4; },
    LDrr_cd: function () { z80._r.c = z80._r.d; z80._r.m = 1; z80._r.t = 4; },
    LDrr_ce: function () { z80._r.c = z80._r.e; z80._r.m = 1; z80._r.t = 4; },
    LDrr_ch: function () { z80._r.c = z80._r.h; z80._r.m = 1; z80._r.t = 4; },
    LDrr_cl: function () { z80._r.c = z80._r.l; z80._r.m = 1; z80._r.t = 4; },
    LDrr_ca: function () { z80._r.c = z80._r.a; z80._r.m = 1; z80._r.t = 4; },
    LDrr_db: function () { z80._r.d = z80._r.b; z80._r.m = 1; z80._r.t = 4; },
    LDrr_dc: function () { z80._r.d = z80._r.c; z80._r.m = 1; z80._r.t = 4; },
    LDrr_dd: function () { z80._r.d = z80._r.d; z80._r.m = 1; z80._r.t = 4; },
    LDrr_de: function () { z80._r.d = z80._r.e; z80._r.m = 1; z80._r.t = 4; },
    LDrr_dh: function () { z80._r.d = z80._r.h; z80._r.m = 1; z80._r.t = 4; },
    LDrr_dl: function () { z80._r.d = z80._r.l; z80._r.m = 1; z80._r.t = 4; },
    LDrr_da: function () { z80._r.d = z80._r.a; z80._r.m = 1; z80._r.t = 4; },
    LDrr_eb: function () { z80._r.e = z80._r.b; z80._r.m = 1; z80._r.t = 4; },
    LDrr_ec: function () { z80._r.e = z80._r.c; z80._r.m = 1; z80._r.t = 4; },
    LDrr_ed: function () { z80._r.e = z80._r.d; z80._r.m = 1; z80._r.t = 4; },
    LDrr_ee: function () { z80._r.e = z80._r.e; z80._r.m = 1; z80._r.t = 4; },
    LDrr_eh: function () { z80._r.e = z80._r.h; z80._r.m = 1; z80._r.t = 4; },
    LDrr_el: function () { z80._r.e = z80._r.l; z80._r.m = 1; z80._r.t = 4; },
    LDrr_ea: function () { z80._r.e = z80._r.a; z80._r.m = 1; z80._r.t = 4; },
    LDrr_hb: function () { z80._r.h = z80._r.b; z80._r.m = 1; z80._r.t = 4; },
    LDrr_hc: function () { z80._r.h = z80._r.c; z80._r.m = 1; z80._r.t = 4; },
    LDrr_hd: function () { z80._r.h = z80._r.d; z80._r.m = 1; z80._r.t = 4; },
    LDrr_he: function () { z80._r.h = z80._r.e; z80._r.m = 1; z80._r.t = 4; },
    LDrr_hh: function () { z80._r.h = z80._r.h; z80._r.m = 1; z80._r.t = 4; },
    LDrr_hl: function () { z80._r.h = z80._r.l; z80._r.m = 1; z80._r.t = 4; },
    LDrr_ha: function () { z80._r.h = z80._r.a; z80._r.m = 1; z80._r.t = 4; },
    LDrr_lb: function () { z80._r.l = z80._r.b; z80._r.m = 1; z80._r.t = 4; },
    LDrr_lc: function () { z80._r.l = z80._r.c; z80._r.m = 1; z80._r.t = 4; },
    LDrr_ld: function () { z80._r.l = z80._r.d; z80._r.m = 1; z80._r.t = 4; },
    LDrr_le: function () { z80._r.l = z80._r.e; z80._r.m = 1; z80._r.t = 4; },
    LDrr_lh: function () { z80._r.l = z80._r.h; z80._r.m = 1; z80._r.t = 4; },
    LDrr_ll: function () { z80._r.l = z80._r.l; z80._r.m = 1; z80._r.t = 4; },
    LDrr_la: function () { z80._r.l = z80._r.a; z80._r.m = 1; z80._r.t = 4; },
    LDrr_ab: function () { z80._r.a = z80._r.b; z80._r.m = 1; z80._r.t = 4; },
    LDrr_ac: function () { z80._r.a = z80._r.c; z80._r.m = 1; z80._r.t = 4; },
    LDrr_ad: function () { z80._r.a = z80._r.d; z80._r.m = 1; z80._r.t = 4; },
    LDrr_ae: function () { z80._r.a = z80._r.e; z80._r.m = 1; z80._r.t = 4; },
    LDrr_ah: function () { z80._r.a = z80._r.h; z80._r.m = 1; z80._r.t = 4; },
    LDrr_al: function () { z80._r.a = z80._r.l; z80._r.m = 1; z80._r.t = 4; },
    LDrr_aa: function () { z80._r.a = z80._r.a; z80._r.m = 1; z80._r.t = 4; },

    LDrHLm_b: function () { z80._r.b = MMU.rb((z80._r.h << 8) + z80._r.l); z80._r.m = 2; z80._r.t = 8; },
    LDrHLm_c: function () { z80._r.c = MMU.rb((z80._r.h << 8) + z80._r.l); z80._r.m = 2; z80._r.t = 8; },
    LDrHLm_d: function () { z80._r.d = MMU.rb((z80._r.h << 8) + z80._r.l); z80._r.m = 2; z80._r.t = 8; },
    LDrHLm_e: function () { z80._r.e = MMU.rb((z80._r.h << 8) + z80._r.l); z80._r.m = 2; z80._r.t = 8; },
    LDrHLm_h: function () { z80._r.h = MMU.rb((z80._r.h << 8) + z80._r.l); z80._r.m = 2; z80._r.t = 8; },
    LDrHLm_l: function () { z80._r.l = MMU.rb((z80._r.h << 8) + z80._r.l); z80._r.m = 2; z80._r.t = 8; },
    LDrHLm_a: function () { z80._r.a = MMU.rb((z80._r.h << 8) + z80._r.l); z80._r.m = 2; z80._r.t = 8; },

    LDHLmr_b: function () { MMU.wb((z80._r.h << 8) + z80._r.l, z80._r.b); z80._r.m = 2; z80._r.t = 8; },
    LDHLmr_c: function () { MMU.wb((z80._r.h << 8) + z80._r.l, z80._r.c); z80._r.m = 2; z80._r.t = 8; },
    LDHLmr_d: function () { MMU.wb((z80._r.h << 8) + z80._r.l, z80._r.d); z80._r.m = 2; z80._r.t = 8; },
    LDHLmr_e: function () { MMU.wb((z80._r.h << 8) + z80._r.l, z80._r.e); z80._r.m = 2; z80._r.t = 8; },
    LDHLmr_h: function () { MMU.wb((z80._r.h << 8) + z80._r.l, z80._r.h); z80._r.m = 2; z80._r.t = 8; },
    LDHLmr_l: function () { MMU.wb((z80._r.h << 8) + z80._r.l, z80._r.l); z80._r.m = 2; z80._r.t = 8; },
    LDHLmr_a: function () { MMU.wb((z80._r.h << 8) + z80._r.l, z80._r.a); z80._r.m = 2; z80._r.t = 8; },

    LDrn_b: function () { z80._r.b = MMU.rb(z80._r.pc); z80._r.pc++; z80._r.m = 2; z80._r.t = 8; },
    LDrn_c: function () { z80._r.c = MMU.rb(z80._r.pc); z80._r.pc++; z80._r.m = 2; z80._r.t = 8; },
    LDrn_d: function () { z80._r.d = MMU.rb(z80._r.pc); z80._r.pc++; z80._r.m = 2; z80._r.t = 8; },
    LDrn_e: function () { z80._r.e = MMU.rb(z80._r.pc); z80._r.pc++; z80._r.m = 2; z80._r.t = 8; },
    LDrn_h: function () { z80._r.h = MMU.rb(z80._r.pc); z80._r.pc++; z80._r.m = 2; z80._r.t = 8; },
    LDrn_l: function () { z80._r.l = MMU.rb(z80._r.pc); z80._r.pc++; z80._r.m = 2; z80._r.t = 8; },
    LDrn_a: function () { z80._r.a = MMU.rb(z80._r.pc); z80._r.pc++; z80._r.m = 2; z80._r.t = 8; },

    LDHLmn: function () { MMU.wb((z80._r.h << 8) + z80._r.l, MMU.rb(z80._r.pc)); z80._r.pc++; z80._r.m = 3; z80._r.t = 12; },

    LDBCmA: function () { MMU.wb((z80._r.b << 8) + z80._r.c, z80._r.a); z80._r.m = 2; z80._r.t = 8; },
    LDDEmA: function () { MMU.wb((z80._r.d << 8) + z80._r.e, z80._r.a); z80._r.m = 2; z80._r.t = 8; },

    LDmmA: function () { MMU.wb(MMU.rw(z80._r.pc), z80._r.a); z80._r.pc += 2; z80._r.m = 4; z80._r.t = 16; },

    LDABCm: function () { z80._r.a = MMU.rb((z80._r.b << 8) + z80._r.c); z80._r.m = 2; z80._r.t = 8; },
    LDADEm: function () { z80._r.a = MMU.rb((z80._r.d << 8) + z80._r.e); z80._r.m = 2; z80._r.t = 8; },

    LDAmm: function () { z80._r.a = MMU.rb(MMU.rw(z80._r.pc)); z80._r.pc += 2; z80._r.m = 4; z80._r.t = 16; },

    LDBCnn: function () { z80._r.c = MMU.rb(z80._r.pc); z80._r.b = MMU.rb(z80._r.pc + 1); z80._r.pc += 2; z80._r.m = 3; z80._r.t = 12; },
    LDDEnn: function () { z80._r.e = MMU.rb(z80._r.pc); z80._r.d = MMU.rb(z80._r.pc + 1); z80._r.pc += 2; z80._r.m = 3; z80._r.t = 12; },
    LDHLnn: function () { z80._r.l = MMU.rb(z80._r.pc); z80._r.h = MMU.rb(z80._r.pc + 1); z80._r.pc += 2; z80._r.m = 3; z80._r.t = 12; },
    LDSPnn: function () { z80._r.sp = MMU.rw(z80._r.pc); z80._r.pc += 2; z80._r.m = 3; z80._r.t = 12; },

    LDHLmm: function () { var i = MMU.rw(z80._r.pc); z80._r.pc += 2; z80._r.l = MMU.rb(i); z80._r.h = MMU.rb(i + 1); z80._r.m = 5; z80._r.t = 20; },
    LDmmHL: function () { var i = MMU.rw(z80._r.pc); z80._r.pc += 2; MMU.ww(i, (z80._r.h << 8) + z80._r.l); z80._r.m = 5; z80._r.t = 20; },

    LDHLIA: function () { MMU.wb((z80._r.h << 8) + z80._r.l, z80._r.a); z80._r.l = (z80._r.l + 1) & 255; if (!z80._r.l) z80._r.h = (z80._r.h + 1) & 255; z80._r.m = 2; z80._r.t = 8; },
    LDAHLI: function () { z80._r.a = MMU.rb((z80._r.h << 8) + z80._r.l); z80._r.l = (z80._r.l + 1) & 255; if (!z80._r.l) z80._r.h = (z80._r.h + 1) & 255; z80._r.m = 2; z80._r.t = 8; },

    LDHLDA: function () { MMU.wb((z80._r.h << 8) + z80._r.l, z80._r.a); z80._r.l = (z80._r.l - 1) & 255; if (z80._r.l == 255) z80._r.h = (z80._r.h - 1) & 255; z80._r.m = 2; z80._r.t = 8; },
    LDAHLD: function () { z80._r.a = MMU.rb((z80._r.h << 8) + z80._r.l); z80._r.l = (z80._r.l - 1) & 255; if (z80._r.l == 255) z80._r.h = (z80._r.h - 1) & 255; z80._r.m = 2; z80._r.t = 8; },

    LDAIOn: function () { z80._r.a = MMU.rb(0xFF00 + MMU.rb(z80._r.pc)); z80._r.pc++; z80._r.m = 3; z80._r.t = 12; },
    LDIOnA: function () { MMU.wb(0xFF00 + MMU.rb(z80._r.pc), z80._r.a); z80._r.pc++; z80._r.m = 3; z80._r.t = 12; },
    LDAIOC: function () { z80._r.a = MMU.rb(0xFF00 + z80._r.c); z80._r.m = 2; z80._r.t = 8; },
    LDIOCA: function () { MMU.wb(0xFF00 + z80._r.c, z80._r.a); z80._r.m = 2; z80._r.t = 8; },

    LDHLSPn: function () { var i = MMU.rb(z80._r.pc); if (i > 127) i = -((~i + 1) & 255); z80._r.pc++; i += z80._r.sp; z80._r.h = (i >> 8) & 255; z80._r.l = i & 255; z80._r.m = 3; z80._r.t = 12; },

    SWAPr_b: function () { let tr = z80._r.b; z80._r.b = MMU.rb((z80._r.h << 8) + z80._r.l); MMU.wb((z80._r.h << 8) + z80._r.l, tr); z80._r.m = 4; z80._r.t = 16; },
    SWAPr_c: function () { let tr = z80._r.c; z80._r.c = MMU.rb((z80._r.h << 8) + z80._r.l); MMU.wb((z80._r.h << 8) + z80._r.l, tr); z80._r.m = 4; z80._r.t = 16; },
    SWAPr_d: function () { let tr = z80._r.d; z80._r.d = MMU.rb((z80._r.h << 8) + z80._r.l); MMU.wb((z80._r.h << 8) + z80._r.l, tr); z80._r.m = 4; z80._r.t = 16; },
    SWAPr_e: function () { let tr = z80._r.e; z80._r.e = MMU.rb((z80._r.h << 8) + z80._r.l); MMU.wb((z80._r.h << 8) + z80._r.l, tr); z80._r.m = 4; z80._r.t = 16; },
    SWAPr_h: function () { let tr = z80._r.h; z80._r.h = MMU.rb((z80._r.h << 8) + z80._r.l); MMU.wb((z80._r.h << 8) + z80._r.l, tr); z80._r.m = 4; z80._r.t = 16; },
    SWAPr_l: function () { let tr = z80._r.l; z80._r.l = MMU.rb((z80._r.h << 8) + z80._r.l); MMU.wb((z80._r.h << 8) + z80._r.l, tr); z80._r.m = 4; z80._r.t = 16; },
    SWAPr_a: function () { let tr = z80._r.a; z80._r.a = MMU.rb((z80._r.h << 8) + z80._r.l); MMU.wb((z80._r.h << 8) + z80._r.l, tr); z80._r.m = 4; z80._r.t = 16; },

    /*--- Data processing ---*/
    ADDr_b: function () { z80._r.a += z80._r.b; z80._ops.fz(z80._r.a); if (z80._r.a > 255) z80._r.f |= 0x10; z80._r.a &= 255; z80._r.m = 1; z80._r.t = 4; },
    ADDr_c: function () { z80._r.a += z80._r.c; z80._ops.fz(z80._r.a); if (z80._r.a > 255) z80._r.f |= 0x10; z80._r.a &= 255; z80._r.m = 1; z80._r.t = 4; },
    ADDr_d: function () { z80._r.a += z80._r.d; z80._ops.fz(z80._r.a); if (z80._r.a > 255) z80._r.f |= 0x10; z80._r.a &= 255; z80._r.m = 1; z80._r.t = 4; },
    ADDr_e: function () { z80._r.a += z80._r.e; z80._ops.fz(z80._r.a); if (z80._r.a > 255) z80._r.f |= 0x10; z80._r.a &= 255; z80._r.m = 1; z80._r.t = 4; },
    ADDr_h: function () { z80._r.a += z80._r.h; z80._ops.fz(z80._r.a); if (z80._r.a > 255) z80._r.f |= 0x10; z80._r.a &= 255; z80._r.m = 1; z80._r.t = 4; },
    ADDr_l: function () { z80._r.a += z80._r.l; z80._ops.fz(z80._r.a); if (z80._r.a > 255) z80._r.f |= 0x10; z80._r.a &= 255; z80._r.m = 1; z80._r.t = 4; },
    ADDr_a: function () { z80._r.a += z80._r.a; z80._ops.fz(z80._r.a); if (z80._r.a > 255) z80._r.f |= 0x10; z80._r.a &= 255; z80._r.m = 1; z80._r.t = 4; },
    ADDHL: function () { z80._r.a += MMU.rb((z80._r.h << 8) + z80._r.l); z80._ops.fz(z80._r.a); if (z80._r.a > 255) z80._r.f |= 0x10; z80._r.a &= 255; z80._r.m = 2; z80._r.t = 8; },
    ADDn: function () { z80._r.a += MMU.rb(z80._r.pc); z80._r.pc++; z80._ops.fz(z80._r.a); if (z80._r.a > 255) z80._r.f |= 0x10; z80._r.a &= 255; z80._r.m = 2; z80._r.t = 8; },
    ADDHLBC: function () { var hl = (z80._r.h << 8) + z80._r.l; hl += (z80._r.b << 8) + z80._r.c; if (hl > 65535) z80._r.f |= 0x10; else z80._r.f &= 0xEF; z80._r.h = (hl >> 8) & 255; z80._r.l = hl & 255; z80._r.m = 3; z80._r.t = 12; },
    ADDHLDE: function () { var hl = (z80._r.h << 8) + z80._r.l; hl += (z80._r.d << 8) + z80._r.e; if (hl > 65535) z80._r.f |= 0x10; else z80._r.f &= 0xEF; z80._r.h = (hl >> 8) & 255; z80._r.l = hl & 255; z80._r.m = 3; z80._r.t = 12; },
    ADDHLHL: function () { var hl = (z80._r.h << 8) + z80._r.l; hl += (z80._r.h << 8) + z80._r.l; if (hl > 65535) z80._r.f |= 0x10; else z80._r.f &= 0xEF; z80._r.h = (hl >> 8) & 255; z80._r.l = hl & 255; z80._r.m = 3; z80._r.t = 12; },
    ADDHLSP: function () { var hl = (z80._r.h << 8) + z80._r.l; hl += z80._r.sp; if (hl > 65535) z80._r.f |= 0x10; else z80._r.f &= 0xEF; z80._r.h = (hl >> 8) & 255; z80._r.l = hl & 255; z80._r.m = 3; z80._r.t = 12; },
    ADDSPn: function () { var i = MMU.rb(z80._r.pc); if (i > 127) i = -((~i + 1) & 255); z80._r.pc++; z80._r.sp += i; z80._r.m = 4; z80._r.t = 16; },

    ADCr_b: function () { z80._r.a += z80._r.b; z80._r.a += (z80._r.f & 0x10) ? 1 : 0; z80._ops.fz(z80._r.a); if (z80._r.a > 255) z80._r.f |= 0x10; z80._r.a &= 255; z80._r.m = 1; z80._r.t = 4; },
    ADCr_c: function () { z80._r.a += z80._r.c; z80._r.a += (z80._r.f & 0x10) ? 1 : 0; z80._ops.fz(z80._r.a); if (z80._r.a > 255) z80._r.f |= 0x10; z80._r.a &= 255; z80._r.m = 1; z80._r.t = 4; },
    ADCr_d: function () { z80._r.a += z80._r.d; z80._r.a += (z80._r.f & 0x10) ? 1 : 0; z80._ops.fz(z80._r.a); if (z80._r.a > 255) z80._r.f |= 0x10; z80._r.a &= 255; z80._r.m = 1; z80._r.t = 4; },
    ADCr_e: function () { z80._r.a += z80._r.e; z80._r.a += (z80._r.f & 0x10) ? 1 : 0; z80._ops.fz(z80._r.a); if (z80._r.a > 255) z80._r.f |= 0x10; z80._r.a &= 255; z80._r.m = 1; z80._r.t = 4; },
    ADCr_h: function () { z80._r.a += z80._r.h; z80._r.a += (z80._r.f & 0x10) ? 1 : 0; z80._ops.fz(z80._r.a); if (z80._r.a > 255) z80._r.f |= 0x10; z80._r.a &= 255; z80._r.m = 1; z80._r.t = 4; },
    ADCr_l: function () { z80._r.a += z80._r.l; z80._r.a += (z80._r.f & 0x10) ? 1 : 0; z80._ops.fz(z80._r.a); if (z80._r.a > 255) z80._r.f |= 0x10; z80._r.a &= 255; z80._r.m = 1; z80._r.t = 4; },
    ADCr_a: function () { z80._r.a += z80._r.a; z80._r.a += (z80._r.f & 0x10) ? 1 : 0; z80._ops.fz(z80._r.a); if (z80._r.a > 255) z80._r.f |= 0x10; z80._r.a &= 255; z80._r.m = 1; z80._r.t = 4; },
    ADCHL: function () { z80._r.a += MMU.rb((z80._r.h << 8) + z80._r.l); z80._r.a += (z80._r.f & 0x10) ? 1 : 0; z80._ops.fz(z80._r.a); if (z80._r.a > 255) z80._r.f |= 0x10; z80._r.a &= 255; z80._r.m = 2; z80._r.t = 8; },
    ADCn: function () { z80._r.a += MMU.rb(z80._r.pc); z80._r.pc++; z80._r.a += (z80._r.f & 0x10) ? 1 : 0; z80._ops.fz(z80._r.a); if (z80._r.a > 255) z80._r.f |= 0x10; z80._r.a &= 255; z80._r.m = 2; z80._r.t = 8; },

    SUBr_b: function () { z80._r.a -= z80._r.b; z80._ops.fz(z80._r.a, 1); if (z80._r.a < 0) z80._r.f |= 0x10; z80._r.a &= 255; z80._r.m = 1; z80._r.t = 4; },
    SUBr_c: function () { z80._r.a -= z80._r.c; z80._ops.fz(z80._r.a, 1); if (z80._r.a < 0) z80._r.f |= 0x10; z80._r.a &= 255; z80._r.m = 1; z80._r.t = 4; },
    SUBr_d: function () { z80._r.a -= z80._r.d; z80._ops.fz(z80._r.a, 1); if (z80._r.a < 0) z80._r.f |= 0x10; z80._r.a &= 255; z80._r.m = 1; z80._r.t = 4; },
    SUBr_e: function () { z80._r.a -= z80._r.e; z80._ops.fz(z80._r.a, 1); if (z80._r.a < 0) z80._r.f |= 0x10; z80._r.a &= 255; z80._r.m = 1; z80._r.t = 4; },
    SUBr_h: function () { z80._r.a -= z80._r.h; z80._ops.fz(z80._r.a, 1); if (z80._r.a < 0) z80._r.f |= 0x10; z80._r.a &= 255; z80._r.m = 1; z80._r.t = 4; },
    SUBr_l: function () { z80._r.a -= z80._r.l; z80._ops.fz(z80._r.a, 1); if (z80._r.a < 0) z80._r.f |= 0x10; z80._r.a &= 255; z80._r.m = 1; z80._r.t = 4; },
    SUBr_a: function () { z80._r.a -= z80._r.a; z80._ops.fz(z80._r.a, 1); if (z80._r.a < 0) z80._r.f |= 0x10; z80._r.a &= 255; z80._r.m = 1; z80._r.t = 4; },
    SUBHL: function () { z80._r.a -= MMU.rb((z80._r.h << 8) + z80._r.l); z80._ops.fz(z80._r.a, 1); if (z80._r.a < 0) z80._r.f |= 0x10; z80._r.a &= 255; z80._r.m = 2; z80._r.t = 8; },
    SUBn: function () { z80._r.a -= MMU.rb(z80._r.pc); z80._r.pc++; z80._ops.fz(z80._r.a, 1); if (z80._r.a < 0) z80._r.f |= 0x10; z80._r.a &= 255; z80._r.m = 2; z80._r.t = 8; },

    SBCr_b: function () { z80._r.a -= z80._r.b; z80._r.a -= (z80._r.f & 0x10) ? 1 : 0; z80._ops.fz(z80._r.a, 1); if (z80._r.a < 0) z80._r.f |= 0x10; z80._r.a &= 255; z80._r.m = 1; z80._r.t = 4; },
    SBCr_c: function () { z80._r.a -= z80._r.c; z80._r.a -= (z80._r.f & 0x10) ? 1 : 0; z80._ops.fz(z80._r.a, 1); if (z80._r.a < 0) z80._r.f |= 0x10; z80._r.a &= 255; z80._r.m = 1; z80._r.t = 4; },
    SBCr_d: function () { z80._r.a -= z80._r.d; z80._r.a -= (z80._r.f & 0x10) ? 1 : 0; z80._ops.fz(z80._r.a, 1); if (z80._r.a < 0) z80._r.f |= 0x10; z80._r.a &= 255; z80._r.m = 1; z80._r.t = 4; },
    SBCr_e: function () { z80._r.a -= z80._r.e; z80._r.a -= (z80._r.f & 0x10) ? 1 : 0; z80._ops.fz(z80._r.a, 1); if (z80._r.a < 0) z80._r.f |= 0x10; z80._r.a &= 255; z80._r.m = 1; z80._r.t = 4; },
    SBCr_h: function () { z80._r.a -= z80._r.h; z80._r.a -= (z80._r.f & 0x10) ? 1 : 0; z80._ops.fz(z80._r.a, 1); if (z80._r.a < 0) z80._r.f |= 0x10; z80._r.a &= 255; z80._r.m = 1; z80._r.t = 4; },
    SBCr_l: function () { z80._r.a -= z80._r.l; z80._r.a -= (z80._r.f & 0x10) ? 1 : 0; z80._ops.fz(z80._r.a, 1); if (z80._r.a < 0) z80._r.f |= 0x10; z80._r.a &= 255; z80._r.m = 1; z80._r.t = 4; },
    SBCr_a: function () { z80._r.a -= z80._r.a; z80._r.a -= (z80._r.f & 0x10) ? 1 : 0; z80._ops.fz(z80._r.a, 1); if (z80._r.a < 0) z80._r.f |= 0x10; z80._r.a &= 255; z80._r.m = 1; z80._r.t = 4; },
    SBCHL: function () { z80._r.a -= MMU.rb((z80._r.h << 8) + z80._r.l); z80._r.a -= (z80._r.f & 0x10) ? 1 : 0; z80._ops.fz(z80._r.a, 1); if (z80._r.a < 0) z80._r.f |= 0x10; z80._r.a &= 255; z80._r.m = 2; z80._r.t = 8; },
    SBCn: function () { z80._r.a -= MMU.rb(z80._r.pc); z80._r.pc++; z80._r.a -= (z80._r.f & 0x10) ? 1 : 0; z80._ops.fz(z80._r.a, 1); if (z80._r.a < 0) z80._r.f |= 0x10; z80._r.a &= 255; z80._r.m = 2; z80._r.t = 8; },

    CPr_b: function () { var i = z80._r.a; i -= z80._r.b; z80._ops.fz(i, 1); if (i < 0) z80._r.f |= 0x10; i &= 255; z80._r.m = 1; z80._r.t = 4; },
    CPr_c: function () { var i = z80._r.a; i -= z80._r.c; z80._ops.fz(i, 1); if (i < 0) z80._r.f |= 0x10; i &= 255; z80._r.m = 1; z80._r.t = 4; },
    CPr_d: function () { var i = z80._r.a; i -= z80._r.d; z80._ops.fz(i, 1); if (i < 0) z80._r.f |= 0x10; i &= 255; z80._r.m = 1; z80._r.t = 4; },
    CPr_e: function () { var i = z80._r.a; i -= z80._r.e; z80._ops.fz(i, 1); if (i < 0) z80._r.f |= 0x10; i &= 255; z80._r.m = 1; z80._r.t = 4; },
    CPr_h: function () { var i = z80._r.a; i -= z80._r.h; z80._ops.fz(i, 1); if (i < 0) z80._r.f |= 0x10; i &= 255; z80._r.m = 1; z80._r.t = 4; },
    CPr_l: function () { var i = z80._r.a; i -= z80._r.l; z80._ops.fz(i, 1); if (i < 0) z80._r.f |= 0x10; i &= 255; z80._r.m = 1; z80._r.t = 4; },
    CPr_a: function () { var i = z80._r.a; i -= z80._r.a; z80._ops.fz(i, 1); if (i < 0) z80._r.f |= 0x10; i &= 255; z80._r.m = 1; z80._r.t = 4; },
    CPHL: function () { var i = z80._r.a; i -= MMU.rb((z80._r.h << 8) + z80._r.l); z80._ops.fz(i, 1); if (i < 0) z80._r.f |= 0x10; i &= 255; z80._r.m = 2; z80._r.t = 8; },
    CPn: function () { var i = z80._r.a; i -= MMU.rb(z80._r.pc); z80._r.pc++; z80._ops.fz(i, 1); if (i < 0) z80._r.f |= 0x10; i &= 255; z80._r.m = 2; z80._r.t = 8; },

    ANDr_b: function () { z80._r.a &= z80._r.b; z80._r.a &= 255; z80._ops.fz(z80._r.a); z80._r.m = 1; z80._r.t = 4; },
    ANDr_c: function () { z80._r.a &= z80._r.c; z80._r.a &= 255; z80._ops.fz(z80._r.a); z80._r.m = 1; z80._r.t = 4; },
    ANDr_d: function () { z80._r.a &= z80._r.d; z80._r.a &= 255; z80._ops.fz(z80._r.a); z80._r.m = 1; z80._r.t = 4; },
    ANDr_e: function () { z80._r.a &= z80._r.e; z80._r.a &= 255; z80._ops.fz(z80._r.a); z80._r.m = 1; z80._r.t = 4; },
    ANDr_h: function () { z80._r.a &= z80._r.h; z80._r.a &= 255; z80._ops.fz(z80._r.a); z80._r.m = 1; z80._r.t = 4; },
    ANDr_l: function () { z80._r.a &= z80._r.l; z80._r.a &= 255; z80._ops.fz(z80._r.a); z80._r.m = 1; z80._r.t = 4; },
    ANDr_a: function () { z80._r.a &= z80._r.a; z80._r.a &= 255; z80._ops.fz(z80._r.a); z80._r.m = 1; z80._r.t = 4; },
    ANDHL: function () { z80._r.a &= MMU.rb((z80._r.h << 8) + z80._r.l); z80._r.a &= 255; z80._ops.fz(z80._r.a); z80._r.m = 2; z80._r.t = 8; },
    ANDn: function () { z80._r.a &= MMU.rb(z80._r.pc); z80._r.pc++; z80._r.a &= 255; z80._ops.fz(z80._r.a); z80._r.m = 2; z80._r.t = 8; },

    ORr_b: function () { z80._r.a |= z80._r.b; z80._r.a &= 255; z80._ops.fz(z80._r.a); z80._r.m = 1; z80._r.t = 4; },
    ORr_c: function () { z80._r.a |= z80._r.c; z80._r.a &= 255; z80._ops.fz(z80._r.a); z80._r.m = 1; z80._r.t = 4; },
    ORr_d: function () { z80._r.a |= z80._r.d; z80._r.a &= 255; z80._ops.fz(z80._r.a); z80._r.m = 1; z80._r.t = 4; },
    ORr_e: function () { z80._r.a |= z80._r.e; z80._r.a &= 255; z80._ops.fz(z80._r.a); z80._r.m = 1; z80._r.t = 4; },
    ORr_h: function () { z80._r.a |= z80._r.h; z80._r.a &= 255; z80._ops.fz(z80._r.a); z80._r.m = 1; z80._r.t = 4; },
    ORr_l: function () { z80._r.a |= z80._r.l; z80._r.a &= 255; z80._ops.fz(z80._r.a); z80._r.m = 1; z80._r.t = 4; },
    ORr_a: function () { z80._r.a |= z80._r.a; z80._r.a &= 255; z80._ops.fz(z80._r.a); z80._r.m = 1; z80._r.t = 4; },
    ORHL: function () { z80._r.a |= MMU.rb((z80._r.h << 8) + z80._r.l); z80._r.a &= 255; z80._ops.fz(z80._r.a); z80._r.m = 2; z80._r.t = 8; },
    ORn: function () { z80._r.a |= MMU.rb(z80._r.pc); z80._r.pc++; z80._r.a &= 255; z80._ops.fz(z80._r.a); z80._r.m = 2; z80._r.t = 8; },

    XORr_b: function () { z80._r.a ^= z80._r.b; z80._r.a &= 255; z80._ops.fz(z80._r.a); z80._r.m = 1; z80._r.t = 4; },
    XORr_c: function () { z80._r.a ^= z80._r.c; z80._r.a &= 255; z80._ops.fz(z80._r.a); z80._r.m = 1; z80._r.t = 4; },
    XORr_d: function () { z80._r.a ^= z80._r.d; z80._r.a &= 255; z80._ops.fz(z80._r.a); z80._r.m = 1; z80._r.t = 4; },
    XORr_e: function () { z80._r.a ^= z80._r.e; z80._r.a &= 255; z80._ops.fz(z80._r.a); z80._r.m = 1; z80._r.t = 4; },
    XORr_h: function () { z80._r.a ^= z80._r.h; z80._r.a &= 255; z80._ops.fz(z80._r.a); z80._r.m = 1; z80._r.t = 4; },
    XORr_l: function () { z80._r.a ^= z80._r.l; z80._r.a &= 255; z80._ops.fz(z80._r.a); z80._r.m = 1; z80._r.t = 4; },
    XORr_a: function () { z80._r.a ^= z80._r.a; z80._r.a &= 255; z80._ops.fz(z80._r.a); z80._r.m = 1; z80._r.t = 4; },
    XORHL: function () { z80._r.a ^= MMU.rb((z80._r.h << 8) + z80._r.l); z80._r.a &= 255; z80._ops.fz(z80._r.a); z80._r.m = 2; z80._r.t = 8; },
    XORn: function () { z80._r.a ^= MMU.rb(z80._r.pc); z80._r.pc++; z80._r.a &= 255; z80._ops.fz(z80._r.a); z80._r.m = 2; z80._r.t = 8; },

    INCr_b: function () { z80._r.b++; z80._r.b &= 255; z80._ops.fz(z80._r.b); z80._r.m = 1; z80._r.t = 4; },
    INCr_c: function () { z80._r.c++; z80._r.c &= 255; z80._ops.fz(z80._r.c); z80._r.m = 1; z80._r.t = 4; },
    INCr_d: function () { z80._r.d++; z80._r.d &= 255; z80._ops.fz(z80._r.d); z80._r.m = 1; z80._r.t = 4; },
    INCr_e: function () { z80._r.e++; z80._r.e &= 255; z80._ops.fz(z80._r.e); z80._r.m = 1; z80._r.t = 4; },
    INCr_h: function () { z80._r.h++; z80._r.h &= 255; z80._ops.fz(z80._r.h); z80._r.m = 1; z80._r.t = 4; },
    INCr_l: function () { z80._r.l++; z80._r.l &= 255; z80._ops.fz(z80._r.l); z80._r.m = 1; z80._r.t = 4; },
    INCr_a: function () { z80._r.a++; z80._r.a &= 255; z80._ops.fz(z80._r.a); z80._r.m = 1; z80._r.t = 4; },
    INCHLm: function () { var i = MMU.rb((z80._r.h << 8) + z80._r.l) + 1; i &= 255; MMU.wb((z80._r.h << 8) + z80._r.l, i); z80._ops.fz(i); z80._r.m = 3; z80._r.t = 12; },

    DECr_b: function () { z80._r.b--; z80._r.b &= 255; z80._ops.fz(z80._r.b); z80._r.m = 1; z80._r.t = 4; },
    DECr_c: function () { z80._r.c--; z80._r.c &= 255; z80._ops.fz(z80._r.c); z80._r.m = 1; z80._r.t = 4; },
    DECr_d: function () { z80._r.d--; z80._r.d &= 255; z80._ops.fz(z80._r.d); z80._r.m = 1; z80._r.t = 4; },
    DECr_e: function () { z80._r.e--; z80._r.e &= 255; z80._ops.fz(z80._r.e); z80._r.m = 1; z80._r.t = 4; },
    DECr_h: function () { z80._r.h--; z80._r.h &= 255; z80._ops.fz(z80._r.h); z80._r.m = 1; z80._r.t = 4; },
    DECr_l: function () { z80._r.l--; z80._r.l &= 255; z80._ops.fz(z80._r.l); z80._r.m = 1; z80._r.t = 4; },
    DECr_a: function () { z80._r.a--; z80._r.a &= 255; z80._ops.fz(z80._r.a); z80._r.m = 1; z80._r.t = 4; },
    DECHLm: function () { var i = MMU.rb((z80._r.h << 8) + z80._r.l) - 1; i &= 255; MMU.wb((z80._r.h << 8) + z80._r.l, i); z80._ops.fz(i); z80._r.m = 3; z80._r.t = 12; },

    INCBC: function () { z80._r.c = (z80._r.c + 1) & 255; if (!z80._r.c) z80._r.b = (z80._r.b + 1) & 255; z80._r.m = 1; z80._r.t = 4; },
    INCDE: function () { z80._r.e = (z80._r.e + 1) & 255; if (!z80._r.e) z80._r.d = (z80._r.d + 1) & 255; z80._r.m = 1; z80._r.t = 4; },
    INCHL: function () { z80._r.l = (z80._r.l + 1) & 255; if (!z80._r.l) z80._r.h = (z80._r.h + 1) & 255; z80._r.m = 1; z80._r.t = 4; },
    INCSP: function () { z80._r.sp = (z80._r.sp + 1) & 65535; z80._r.m = 1; z80._r.t = 4; },

    DECBC: function () { z80._r.c = (z80._r.c - 1) & 255; if (z80._r.c == 255) z80._r.b = (z80._r.b - 1) & 255; z80._r.m = 1; z80._r.t = 4; },
    DECDE: function () { z80._r.e = (z80._r.e - 1) & 255; if (z80._r.e == 255) z80._r.d = (z80._r.d - 1) & 255; z80._r.m = 1; z80._r.t = 4; },
    DECHL: function () { z80._r.l = (z80._r.l - 1) & 255; if (z80._r.l == 255) z80._r.h = (z80._r.h - 1) & 255; z80._r.m = 1; z80._r.t = 4; },
    DECSP: function () { z80._r.sp = (z80._r.sp - 1) & 65535; z80._r.m = 1; z80._r.t = 4; },

    /*--- Bit manipulation ---*/
    BIT0b: function () { z80._ops.fz(z80._r.b & 0x01); z80._r.m = 2; z80._r.t = 8; },
    BIT0c: function () { z80._ops.fz(z80._r.c & 0x01); z80._r.m = 2; z80._r.t = 8; },
    BIT0d: function () { z80._ops.fz(z80._r.d & 0x01); z80._r.m = 2; z80._r.t = 8; },
    BIT0e: function () { z80._ops.fz(z80._r.e & 0x01); z80._r.m = 2; z80._r.t = 8; },
    BIT0h: function () { z80._ops.fz(z80._r.h & 0x01); z80._r.m = 2; z80._r.t = 8; },
    BIT0l: function () { z80._ops.fz(z80._r.l & 0x01); z80._r.m = 2; z80._r.t = 8; },
    BIT0a: function () { z80._ops.fz(z80._r.a & 0x01); z80._r.m = 2; z80._r.t = 8; },
    BIT0m: function () { z80._ops.fz(MMU.rb((z80._r.h << 8) + z80._r.l) & 0x01); z80._r.m = 3; z80._r.t = 12; },

    BIT1b: function () { z80._ops.fz(z80._r.b & 0x02); z80._r.m = 2; z80._r.t = 8; },
    BIT1c: function () { z80._ops.fz(z80._r.c & 0x02); z80._r.m = 2; z80._r.t = 8; },
    BIT1d: function () { z80._ops.fz(z80._r.d & 0x02); z80._r.m = 2; z80._r.t = 8; },
    BIT1e: function () { z80._ops.fz(z80._r.e & 0x02); z80._r.m = 2; z80._r.t = 8; },
    BIT1h: function () { z80._ops.fz(z80._r.h & 0x02); z80._r.m = 2; z80._r.t = 8; },
    BIT1l: function () { z80._ops.fz(z80._r.l & 0x02); z80._r.m = 2; z80._r.t = 8; },
    BIT1a: function () { z80._ops.fz(z80._r.a & 0x02); z80._r.m = 2; z80._r.t = 8; },
    BIT1m: function () { z80._ops.fz(MMU.rb((z80._r.h << 8) + z80._r.l) & 0x02); z80._r.m = 3; z80._r.t = 12; },

    BIT2b: function () { z80._ops.fz(z80._r.b & 0x04); z80._r.m = 2; z80._r.t = 8; },
    BIT2c: function () { z80._ops.fz(z80._r.c & 0x04); z80._r.m = 2; z80._r.t = 8; },
    BIT2d: function () { z80._ops.fz(z80._r.d & 0x04); z80._r.m = 2; z80._r.t = 8; },
    BIT2e: function () { z80._ops.fz(z80._r.e & 0x04); z80._r.m = 2; z80._r.t = 8; },
    BIT2h: function () { z80._ops.fz(z80._r.h & 0x04); z80._r.m = 2; z80._r.t = 8; },
    BIT2l: function () { z80._ops.fz(z80._r.l & 0x04); z80._r.m = 2; z80._r.t = 8; },
    BIT2a: function () { z80._ops.fz(z80._r.a & 0x04); z80._r.m = 2; z80._r.t = 8; },
    BIT2m: function () { z80._ops.fz(MMU.rb((z80._r.h << 8) + z80._r.l) & 0x04); z80._r.m = 3; z80._r.t = 12; },

    BIT3b: function () { z80._ops.fz(z80._r.b & 0x08); z80._r.m = 2; z80._r.t = 8; },
    BIT3c: function () { z80._ops.fz(z80._r.c & 0x08); z80._r.m = 2; z80._r.t = 8; },
    BIT3d: function () { z80._ops.fz(z80._r.d & 0x08); z80._r.m = 2; z80._r.t = 8; },
    BIT3e: function () { z80._ops.fz(z80._r.e & 0x08); z80._r.m = 2; z80._r.t = 8; },
    BIT3h: function () { z80._ops.fz(z80._r.h & 0x08); z80._r.m = 2; z80._r.t = 8; },
    BIT3l: function () { z80._ops.fz(z80._r.l & 0x08); z80._r.m = 2; z80._r.t = 8; },
    BIT3a: function () { z80._ops.fz(z80._r.a & 0x08); z80._r.m = 2; z80._r.t = 8; },
    BIT3m: function () { z80._ops.fz(MMU.rb((z80._r.h << 8) + z80._r.l) & 0x08); z80._r.m = 3; z80._r.t = 12; },

    BIT4b: function () { z80._ops.fz(z80._r.b & 0x10); z80._r.m = 2; z80._r.t = 8; },
    BIT4c: function () { z80._ops.fz(z80._r.c & 0x10); z80._r.m = 2; z80._r.t = 8; },
    BIT4d: function () { z80._ops.fz(z80._r.d & 0x10); z80._r.m = 2; z80._r.t = 8; },
    BIT4e: function () { z80._ops.fz(z80._r.e & 0x10); z80._r.m = 2; z80._r.t = 8; },
    BIT4h: function () { z80._ops.fz(z80._r.h & 0x10); z80._r.m = 2; z80._r.t = 8; },
    BIT4l: function () { z80._ops.fz(z80._r.l & 0x10); z80._r.m = 2; z80._r.t = 8; },
    BIT4a: function () { z80._ops.fz(z80._r.a & 0x10); z80._r.m = 2; z80._r.t = 8; },
    BIT4m: function () { z80._ops.fz(MMU.rb((z80._r.h << 8) + z80._r.l) & 0x10); z80._r.m = 3; z80._r.t = 12; },

    BIT5b: function () { z80._ops.fz(z80._r.b & 0x20); z80._r.m = 2; z80._r.t = 8; },
    BIT5c: function () { z80._ops.fz(z80._r.c & 0x20); z80._r.m = 2; z80._r.t = 8; },
    BIT5d: function () { z80._ops.fz(z80._r.d & 0x20); z80._r.m = 2; z80._r.t = 8; },
    BIT5e: function () { z80._ops.fz(z80._r.e & 0x20); z80._r.m = 2; z80._r.t = 8; },
    BIT5h: function () { z80._ops.fz(z80._r.h & 0x20); z80._r.m = 2; z80._r.t = 8; },
    BIT5l: function () { z80._ops.fz(z80._r.l & 0x20); z80._r.m = 2; z80._r.t = 8; },
    BIT5a: function () { z80._ops.fz(z80._r.a & 0x20); z80._r.m = 2; z80._r.t = 8; },
    BIT5m: function () { z80._ops.fz(MMU.rb((z80._r.h << 8) + z80._r.l) & 0x20); z80._r.m = 3; z80._r.t = 12; },

    BIT6b: function () { z80._ops.fz(z80._r.b & 0x40); z80._r.m = 2; z80._r.t = 8; },
    BIT6c: function () { z80._ops.fz(z80._r.c & 0x40); z80._r.m = 2; z80._r.t = 8; },
    BIT6d: function () { z80._ops.fz(z80._r.d & 0x40); z80._r.m = 2; z80._r.t = 8; },
    BIT6e: function () { z80._ops.fz(z80._r.e & 0x40); z80._r.m = 2; z80._r.t = 8; },
    BIT6h: function () { z80._ops.fz(z80._r.h & 0x40); z80._r.m = 2; z80._r.t = 8; },
    BIT6l: function () { z80._ops.fz(z80._r.l & 0x40); z80._r.m = 2; z80._r.t = 8; },
    BIT6a: function () { z80._ops.fz(z80._r.a & 0x40); z80._r.m = 2; z80._r.t = 8; },
    BIT6m: function () { z80._ops.fz(MMU.rb((z80._r.h << 8) + z80._r.l) & 0x40); z80._r.m = 3; z80._r.t = 12; },

    BIT7b: function () { z80._ops.fz(z80._r.b & 0x80); z80._r.m = 2; z80._r.t = 8; },
    BIT7c: function () { z80._ops.fz(z80._r.c & 0x80); z80._r.m = 2; z80._r.t = 8; },
    BIT7d: function () { z80._ops.fz(z80._r.d & 0x80); z80._r.m = 2; z80._r.t = 8; },
    BIT7e: function () { z80._ops.fz(z80._r.e & 0x80); z80._r.m = 2; z80._r.t = 8; },
    BIT7h: function () { z80._ops.fz(z80._r.h & 0x80); z80._r.m = 2; z80._r.t = 8; },
    BIT7l: function () { z80._ops.fz(z80._r.l & 0x80); z80._r.m = 2; z80._r.t = 8; },
    BIT7a: function () { z80._ops.fz(z80._r.a & 0x80); z80._r.m = 2; z80._r.t = 8; },
    BIT7m: function () { z80._ops.fz(MMU.rb((z80._r.h << 8) + z80._r.l) & 0x80); z80._r.m = 3; z80._r.t = 12; },

    RLA: function () { let ci = z80._r.f & 0x10 ? 1 : 0; let co = z80._r.a & 0x80 ? 0x10 : 0; z80._r.a = (z80._r.a << 1) + ci; z80._r.a &= 255; z80._r.f = (z80._r.f & 0xEF) + co; z80._r.m = 1; z80._r.t = 4; },
    RLCA: function () { let ci = z80._r.a & 0x80 ? 1 : 0; let co = z80._r.a & 0x80 ? 0x10 : 0; z80._r.a = (z80._r.a << 1) + ci; z80._r.a &= 255; z80._r.f = (z80._r.f & 0xEF) + co; z80._r.m = 1; z80._r.t = 4; },
    RRA: function () { let ci = z80._r.f & 0x10 ? 0x80 : 0; let co = z80._r.a & 1 ? 0x10 : 0; z80._r.a = (z80._r.a >> 1) + ci; z80._r.a &= 255; z80._r.f = (z80._r.f & 0xEF) + co; z80._r.m = 1; z80._r.t = 4; },
    RRCA: function () { let ci = z80._r.a & 1 ? 0x80 : 0; let co = z80._r.a & 1 ? 0x10 : 0; z80._r.a = (z80._r.a >> 1) + ci; z80._r.a &= 255; z80._r.f = (z80._r.f & 0xEF) + co; z80._r.m = 1; z80._r.t = 4; },

    RLr_b: function () { let ci = z80._r.f & 0x10 ? 1 : 0; let co = z80._r.b & 0x80 ? 0x10 : 0; z80._r.b = (z80._r.b << 1) + ci; z80._r.b &= 255; z80._ops.fz(z80._r.b); z80._r.f = (z80._r.f & 0xEF) + co; z80._r.m = 2; z80._r.t = 8; },
    RLr_c: function () { let ci = z80._r.f & 0x10 ? 1 : 0; let co = z80._r.c & 0x80 ? 0x10 : 0; z80._r.c = (z80._r.c << 1) + ci; z80._r.c &= 255; z80._ops.fz(z80._r.c); z80._r.f = (z80._r.f & 0xEF) + co; z80._r.m = 2; z80._r.t = 8; },
    RLr_d: function () { let ci = z80._r.f & 0x10 ? 1 : 0; let co = z80._r.d & 0x80 ? 0x10 : 0; z80._r.d = (z80._r.d << 1) + ci; z80._r.d &= 255; z80._ops.fz(z80._r.d); z80._r.f = (z80._r.f & 0xEF) + co; z80._r.m = 2; z80._r.t = 8; },
    RLr_e: function () { let ci = z80._r.f & 0x10 ? 1 : 0; let co = z80._r.e & 0x80 ? 0x10 : 0; z80._r.e = (z80._r.e << 1) + ci; z80._r.e &= 255; z80._ops.fz(z80._r.e); z80._r.f = (z80._r.f & 0xEF) + co; z80._r.m = 2; z80._r.t = 8; },
    RLr_h: function () { let ci = z80._r.f & 0x10 ? 1 : 0; let co = z80._r.h & 0x80 ? 0x10 : 0; z80._r.h = (z80._r.h << 1) + ci; z80._r.h &= 255; z80._ops.fz(z80._r.h); z80._r.f = (z80._r.f & 0xEF) + co; z80._r.m = 2; z80._r.t = 8; },
    RLr_l: function () { let ci = z80._r.f & 0x10 ? 1 : 0; let co = z80._r.l & 0x80 ? 0x10 : 0; z80._r.l = (z80._r.l << 1) + ci; z80._r.l &= 255; z80._ops.fz(z80._r.l); z80._r.f = (z80._r.f & 0xEF) + co; z80._r.m = 2; z80._r.t = 8; },
    RLr_a: function () { let ci = z80._r.f & 0x10 ? 1 : 0; let co = z80._r.a & 0x80 ? 0x10 : 0; z80._r.a = (z80._r.a << 1) + ci; z80._r.a &= 255; z80._ops.fz(z80._r.a); z80._r.f = (z80._r.f & 0xEF) + co; z80._r.m = 2; z80._r.t = 8; },
    RLHL: function () { let i = MMU.rb((z80._r.h << 8) + z80._r.l); let ci = z80._r.f & 0x10 ? 1 : 0; let co = i & 0x80 ? 0x10 : 0; i = (i << 1) + ci; i &= 255; z80._ops.fz(i); MMU.wb((z80._r.h << 8) + z80._r.l, i); z80._r.f = (z80._r.f & 0xEF) + co; z80._r.m = 4; z80._r.t = 16; },

    RLCr_b: function () { let ci = z80._r.b & 0x80 ? 1 : 0; let co = z80._r.b & 0x80 ? 0x10 : 0; z80._r.b = (z80._r.b << 1) + ci; z80._r.b &= 255; z80._ops.fz(z80._r.b); z80._r.f = (z80._r.f & 0xEF) + co; z80._r.m = 2; z80._r.t = 8; },
    RLCr_c: function () { let ci = z80._r.c & 0x80 ? 1 : 0; let co = z80._r.c & 0x80 ? 0x10 : 0; z80._r.c = (z80._r.c << 1) + ci; z80._r.c &= 255; z80._ops.fz(z80._r.c); z80._r.f = (z80._r.f & 0xEF) + co; z80._r.m = 2; z80._r.t = 8; },
    RLCr_d: function () { let ci = z80._r.d & 0x80 ? 1 : 0; let co = z80._r.d & 0x80 ? 0x10 : 0; z80._r.d = (z80._r.d << 1) + ci; z80._r.d &= 255; z80._ops.fz(z80._r.d); z80._r.f = (z80._r.f & 0xEF) + co; z80._r.m = 2; z80._r.t = 8; },
    RLCr_e: function () { let ci = z80._r.e & 0x80 ? 1 : 0; let co = z80._r.e & 0x80 ? 0x10 : 0; z80._r.e = (z80._r.e << 1) + ci; z80._r.e &= 255; z80._ops.fz(z80._r.e); z80._r.f = (z80._r.f & 0xEF) + co; z80._r.m = 2; z80._r.t = 8; },
    RLCr_h: function () { let ci = z80._r.h & 0x80 ? 1 : 0; let co = z80._r.h & 0x80 ? 0x10 : 0; z80._r.h = (z80._r.h << 1) + ci; z80._r.h &= 255; z80._ops.fz(z80._r.h); z80._r.f = (z80._r.f & 0xEF) + co; z80._r.m = 2; z80._r.t = 8; },
    RLCr_l: function () { let ci = z80._r.l & 0x80 ? 1 : 0; let co = z80._r.l & 0x80 ? 0x10 : 0; z80._r.l = (z80._r.l << 1) + ci; z80._r.l &= 255; z80._ops.fz(z80._r.l); z80._r.f = (z80._r.f & 0xEF) + co; z80._r.m = 2; z80._r.t = 8; },
    RLCr_a: function () { let ci = z80._r.a & 0x80 ? 1 : 0; let co = z80._r.a & 0x80 ? 0x10 : 0; z80._r.a = (z80._r.a << 1) + ci; z80._r.a &= 255; z80._ops.fz(z80._r.a); z80._r.f = (z80._r.f & 0xEF) + co; z80._r.m = 2; z80._r.t = 8; },
    RLCHL: function () { let i = MMU.rb((z80._r.h << 8) + z80._r.l); let ci = i & 0x80 ? 1 : 0; let co = i & 0x80 ? 0x10 : 0; i = (i << 1) + ci; i &= 255; z80._ops.fz(i); MMU.wb((z80._r.h << 8) + z80._r.l, i); z80._r.f = (z80._r.f & 0xEF) + co; z80._r.m = 4; z80._r.t = 16; },

    RRr_b: function () { let ci = z80._r.f & 0x10 ? 0x80 : 0; let co = z80._r.b & 1 ? 0x10 : 0; z80._r.b = (z80._r.b >> 1) + ci; z80._r.b &= 255; z80._ops.fz(z80._r.b); z80._r.f = (z80._r.f & 0xEF) + co; z80._r.m = 2; z80._r.t = 8; },
    RRr_c: function () { let ci = z80._r.f & 0x10 ? 0x80 : 0; let co = z80._r.c & 1 ? 0x10 : 0; z80._r.c = (z80._r.c >> 1) + ci; z80._r.c &= 255; z80._ops.fz(z80._r.c); z80._r.f = (z80._r.f & 0xEF) + co; z80._r.m = 2; z80._r.t = 8; },
    RRr_d: function () { let ci = z80._r.f & 0x10 ? 0x80 : 0; let co = z80._r.d & 1 ? 0x10 : 0; z80._r.d = (z80._r.d >> 1) + ci; z80._r.d &= 255; z80._ops.fz(z80._r.d); z80._r.f = (z80._r.f & 0xEF) + co; z80._r.m = 2; z80._r.t = 8; },
    RRr_e: function () { let ci = z80._r.f & 0x10 ? 0x80 : 0; let co = z80._r.e & 1 ? 0x10 : 0; z80._r.e = (z80._r.e >> 1) + ci; z80._r.e &= 255; z80._ops.fz(z80._r.e); z80._r.f = (z80._r.f & 0xEF) + co; z80._r.m = 2; z80._r.t = 8; },
    RRr_h: function () { let ci = z80._r.f & 0x10 ? 0x80 : 0; let co = z80._r.h & 1 ? 0x10 : 0; z80._r.h = (z80._r.h >> 1) + ci; z80._r.h &= 255; z80._ops.fz(z80._r.h); z80._r.f = (z80._r.f & 0xEF) + co; z80._r.m = 2; z80._r.t = 8; },
    RRr_l: function () { let ci = z80._r.f & 0x10 ? 0x80 : 0; let co = z80._r.l & 1 ? 0x10 : 0; z80._r.l = (z80._r.l >> 1) + ci; z80._r.l &= 255; z80._ops.fz(z80._r.l); z80._r.f = (z80._r.f & 0xEF) + co; z80._r.m = 2; z80._r.t = 8; },
    RRr_a: function () { let ci = z80._r.f & 0x10 ? 0x80 : 0; let co = z80._r.a & 1 ? 0x10 : 0; z80._r.a = (z80._r.a >> 1) + ci; z80._r.a &= 255; z80._ops.fz(z80._r.a); z80._r.f = (z80._r.f & 0xEF) + co; z80._r.m = 2; z80._r.t = 8; },
    RRHL: function () { let i = MMU.rb((z80._r.h << 8) + z80._r.l); let ci = z80._r.f & 0x10 ? 0x80 : 0; let co = i & 1 ? 0x10 : 0; i = (i >> 1) + ci; i &= 255; MMU.wb((z80._r.h << 8) + z80._r.l, i); z80._ops.fz(i); z80._r.f = (z80._r.f & 0xEF) + co; z80._r.m = 4; z80._r.t = 16; },

    RRCr_b: function () { let ci = z80._r.b & 1 ? 0x80 : 0; let co = z80._r.b & 1 ? 0x10 : 0; z80._r.b = (z80._r.b >> 1) + ci; z80._r.b &= 255; z80._ops.fz(z80._r.b); z80._r.f = (z80._r.f & 0xEF) + co; z80._r.m = 2; z80._r.t = 8; },
    RRCr_c: function () { let ci = z80._r.c & 1 ? 0x80 : 0; let co = z80._r.c & 1 ? 0x10 : 0; z80._r.c = (z80._r.c >> 1) + ci; z80._r.c &= 255; z80._ops.fz(z80._r.c); z80._r.f = (z80._r.f & 0xEF) + co; z80._r.m = 2; z80._r.t = 8; },
    RRCr_d: function () { let ci = z80._r.d & 1 ? 0x80 : 0; let co = z80._r.d & 1 ? 0x10 : 0; z80._r.d = (z80._r.d >> 1) + ci; z80._r.d &= 255; z80._ops.fz(z80._r.d); z80._r.f = (z80._r.f & 0xEF) + co; z80._r.m = 2; z80._r.t = 8; },
    RRCr_e: function () { let ci = z80._r.e & 1 ? 0x80 : 0; let co = z80._r.e & 1 ? 0x10 : 0; z80._r.e = (z80._r.e >> 1) + ci; z80._r.e &= 255; z80._ops.fz(z80._r.e); z80._r.f = (z80._r.f & 0xEF) + co; z80._r.m = 2; z80._r.t = 8; },
    RRCr_h: function () { let ci = z80._r.h & 1 ? 0x80 : 0; let co = z80._r.h & 1 ? 0x10 : 0; z80._r.h = (z80._r.h >> 1) + ci; z80._r.h &= 255; z80._ops.fz(z80._r.h); z80._r.f = (z80._r.f & 0xEF) + co; z80._r.m = 2; z80._r.t = 8; },
    RRCr_l: function () { let ci = z80._r.l & 1 ? 0x80 : 0; let co = z80._r.l & 1 ? 0x10 : 0; z80._r.l = (z80._r.l >> 1) + ci; z80._r.l &= 255; z80._ops.fz(z80._r.l); z80._r.f = (z80._r.f & 0xEF) + co; z80._r.m = 2; z80._r.t = 8; },
    RRCr_a: function () { let ci = z80._r.a & 1 ? 0x80 : 0; let co = z80._r.a & 1 ? 0x10 : 0; z80._r.a = (z80._r.a >> 1) + ci; z80._r.a &= 255; z80._ops.fz(z80._r.a); z80._r.f = (z80._r.f & 0xEF) + co; z80._r.m = 2; z80._r.t = 8; },
    RRCHL: function () { let i = MMU.rb((z80._r.h << 8) + z80._r.l); let ci = i & 1 ? 0x80 : 0; let co = i & 1 ? 0x10 : 0; i = (i >> 1) + ci; i &= 255; MMU.wb((z80._r.h << 8) + z80._r.l, i); z80._ops.fz(i); z80._r.f = (z80._r.f & 0xEF) + co; z80._r.m = 4; z80._r.t = 16; },

    SLAr_b: function () { let co = z80._r.b & 0x80 ? 0x10 : 0; z80._r.b = (z80._r.b << 1) & 255; z80._ops.fz(z80._r.b); z80._r.f = (z80._r.f & 0xEF) + co; z80._r.m = 2; z80._r.t = 8; },
    SLAr_c: function () { let co = z80._r.c & 0x80 ? 0x10 : 0; z80._r.c = (z80._r.c << 1) & 255; z80._ops.fz(z80._r.c); z80._r.f = (z80._r.f & 0xEF) + co; z80._r.m = 2; z80._r.t = 8; },
    SLAr_d: function () { let co = z80._r.d & 0x80 ? 0x10 : 0; z80._r.d = (z80._r.d << 1) & 255; z80._ops.fz(z80._r.d); z80._r.f = (z80._r.f & 0xEF) + co; z80._r.m = 2; z80._r.t = 8; },
    SLAr_e: function () { let co = z80._r.e & 0x80 ? 0x10 : 0; z80._r.e = (z80._r.e << 1) & 255; z80._ops.fz(z80._r.e); z80._r.f = (z80._r.f & 0xEF) + co; z80._r.m = 2; z80._r.t = 8; },
    SLAr_h: function () { let co = z80._r.h & 0x80 ? 0x10 : 0; z80._r.h = (z80._r.h << 1) & 255; z80._ops.fz(z80._r.h); z80._r.f = (z80._r.f & 0xEF) + co; z80._r.m = 2; z80._r.t = 8; },
    SLAr_l: function () { let co = z80._r.l & 0x80 ? 0x10 : 0; z80._r.l = (z80._r.l << 1) & 255; z80._ops.fz(z80._r.l); z80._r.f = (z80._r.f & 0xEF) + co; z80._r.m = 2; z80._r.t = 8; },
    SLAr_a: function () { let co = z80._r.a & 0x80 ? 0x10 : 0; z80._r.a = (z80._r.a << 1) & 255; z80._ops.fz(z80._r.a); z80._r.f = (z80._r.f & 0xEF) + co; z80._r.m = 2; z80._r.t = 8; },

    SLLr_b: function () { let co = z80._r.b & 0x80 ? 0x10 : 0; z80._r.b = (z80._r.b << 1) & 255 + 1; z80._ops.fz(z80._r.b); z80._r.f = (z80._r.f & 0xEF) + co; z80._r.m = 2; z80._r.t = 8; },
    SLLr_c: function () { let co = z80._r.c & 0x80 ? 0x10 : 0; z80._r.c = (z80._r.c << 1) & 255 + 1; z80._ops.fz(z80._r.c); z80._r.f = (z80._r.f & 0xEF) + co; z80._r.m = 2; z80._r.t = 8; },
    SLLr_d: function () { let co = z80._r.d & 0x80 ? 0x10 : 0; z80._r.d = (z80._r.d << 1) & 255 + 1; z80._ops.fz(z80._r.d); z80._r.f = (z80._r.f & 0xEF) + co; z80._r.m = 2; z80._r.t = 8; },
    SLLr_e: function () { let co = z80._r.e & 0x80 ? 0x10 : 0; z80._r.e = (z80._r.e << 1) & 255 + 1; z80._ops.fz(z80._r.e); z80._r.f = (z80._r.f & 0xEF) + co; z80._r.m = 2; z80._r.t = 8; },
    SLLr_h: function () { let co = z80._r.h & 0x80 ? 0x10 : 0; z80._r.h = (z80._r.h << 1) & 255 + 1; z80._ops.fz(z80._r.h); z80._r.f = (z80._r.f & 0xEF) + co; z80._r.m = 2; z80._r.t = 8; },
    SLLr_l: function () { let co = z80._r.l & 0x80 ? 0x10 : 0; z80._r.l = (z80._r.l << 1) & 255 + 1; z80._ops.fz(z80._r.l); z80._r.f = (z80._r.f & 0xEF) + co; z80._r.m = 2; z80._r.t = 8; },
    SLLr_a: function () { let co = z80._r.a & 0x80 ? 0x10 : 0; z80._r.a = (z80._r.a << 1) & 255 + 1; z80._ops.fz(z80._r.a); z80._r.f = (z80._r.f & 0xEF) + co; z80._r.m = 2; z80._r.t = 8; },

    SRAr_b: function () { let ci = z80._r.b & 0x80; let co = z80._r.b & 1 ? 0x10 : 0; z80._r.b = ((z80._r.b >> 1) + ci) & 255; z80._ops.fz(z80._r.b); z80._r.f = (z80._r.f & 0xEF) + co; z80._r.m = 2; z80._r.t = 8; },
    SRAr_c: function () { let ci = z80._r.c & 0x80; let co = z80._r.c & 1 ? 0x10 : 0; z80._r.c = ((z80._r.c >> 1) + ci) & 255; z80._ops.fz(z80._r.c); z80._r.f = (z80._r.f & 0xEF) + co; z80._r.m = 2; z80._r.t = 8; },
    SRAr_d: function () { let ci = z80._r.d & 0x80; let co = z80._r.d & 1 ? 0x10 : 0; z80._r.d = ((z80._r.d >> 1) + ci) & 255; z80._ops.fz(z80._r.d); z80._r.f = (z80._r.f & 0xEF) + co; z80._r.m = 2; z80._r.t = 8; },
    SRAr_e: function () { let ci = z80._r.e & 0x80; let co = z80._r.e & 1 ? 0x10 : 0; z80._r.e = ((z80._r.e >> 1) + ci) & 255; z80._ops.fz(z80._r.e); z80._r.f = (z80._r.f & 0xEF) + co; z80._r.m = 2; z80._r.t = 8; },
    SRAr_h: function () { let ci = z80._r.h & 0x80; let co = z80._r.h & 1 ? 0x10 : 0; z80._r.h = ((z80._r.h >> 1) + ci) & 255; z80._ops.fz(z80._r.h); z80._r.f = (z80._r.f & 0xEF) + co; z80._r.m = 2; z80._r.t = 8; },
    SRAr_l: function () { let ci = z80._r.l & 0x80; let co = z80._r.l & 1 ? 0x10 : 0; z80._r.l = ((z80._r.l >> 1) + ci) & 255; z80._ops.fz(z80._r.l); z80._r.f = (z80._r.f & 0xEF) + co; z80._r.m = 2; z80._r.t = 8; },
    SRAr_a: function () { let ci = z80._r.a & 0x80; let co = z80._r.a & 1 ? 0x10 : 0; z80._r.a = ((z80._r.a >> 1) + ci) & 255; z80._ops.fz(z80._r.a); z80._r.f = (z80._r.f & 0xEF) + co; z80._r.m = 2; z80._r.t = 8; },

    SRLr_b: function () { let co = z80._r.b & 1 ? 0x10 : 0; z80._r.b = (z80._r.b >> 1) & 255; z80._ops.fz(z80._r.b); z80._r.f = (z80._r.f & 0xEF) + co; z80._r.m = 2; z80._r.t = 8; },
    SRLr_c: function () { let co = z80._r.c & 1 ? 0x10 : 0; z80._r.c = (z80._r.c >> 1) & 255; z80._ops.fz(z80._r.c); z80._r.f = (z80._r.f & 0xEF) + co; z80._r.m = 2; z80._r.t = 8; },
    SRLr_d: function () { let co = z80._r.d & 1 ? 0x10 : 0; z80._r.d = (z80._r.d >> 1) & 255; z80._ops.fz(z80._r.d); z80._r.f = (z80._r.f & 0xEF) + co; z80._r.m = 2; z80._r.t = 8; },
    SRLr_e: function () { let co = z80._r.e & 1 ? 0x10 : 0; z80._r.e = (z80._r.e >> 1) & 255; z80._ops.fz(z80._r.e); z80._r.f = (z80._r.f & 0xEF) + co; z80._r.m = 2; z80._r.t = 8; },
    SRLr_h: function () { let co = z80._r.h & 1 ? 0x10 : 0; z80._r.h = (z80._r.h >> 1) & 255; z80._ops.fz(z80._r.h); z80._r.f = (z80._r.f & 0xEF) + co; z80._r.m = 2; z80._r.t = 8; },
    SRLr_l: function () { let co = z80._r.l & 1 ? 0x10 : 0; z80._r.l = (z80._r.l >> 1) & 255; z80._ops.fz(z80._r.l); z80._r.f = (z80._r.f & 0xEF) + co; z80._r.m = 2; z80._r.t = 8; },
    SRLr_a: function () { let co = z80._r.a & 1 ? 0x10 : 0; z80._r.a = (z80._r.a >> 1) & 255; z80._ops.fz(z80._r.a); z80._r.f = (z80._r.f & 0xEF) + co; z80._r.m = 2; z80._r.t = 8; },

    CPL: function () { z80._r.a = (~z80._r.a) & 255; z80._ops.fz(z80._r.a, 1); z80._r.m = 1; z80._r.t = 4; },
    NEG: function () { z80._r.a = 0 - z80._r.a; z80._ops.fz(z80._r.a, 1); if (z80._r.a < 0) z80._r.f |= 0x10; z80._r.a &= 255; z80._r.m = 2; z80._r.t = 8; },

    CCF: function () { let ci = z80._r.f & 0x10 ? 0 : 0x10; z80._r.f = (z80._r.f & 0xEF) + ci; z80._r.m = 1; z80._r.t = 4; },
    SCF: function () { z80._r.f |= 0x10; z80._r.m = 1; z80._r.t = 4; },

    /*--- Stack ---*/
    PUSHBC: function () { z80._r.sp--; MMU.wb(z80._r.sp, z80._r.b); z80._r.sp--; MMU.wb(z80._r.sp, z80._r.c); z80._r.m = 3; z80._r.t = 12; },
    PUSHDE: function () { z80._r.sp--; MMU.wb(z80._r.sp, z80._r.d); z80._r.sp--; MMU.wb(z80._r.sp, z80._r.e); z80._r.m = 3; z80._r.t = 12; },
    PUSHHL: function () { z80._r.sp--; MMU.wb(z80._r.sp, z80._r.h); z80._r.sp--; MMU.wb(z80._r.sp, z80._r.l); z80._r.m = 3; z80._r.t = 12; },
    PUSHAF: function () { z80._r.sp--; MMU.wb(z80._r.sp, z80._r.a); z80._r.sp--; MMU.wb(z80._r.sp, z80._r.f); z80._r.m = 3; z80._r.t = 12; },

    POPBC: function () { z80._r.c = MMU.rb(z80._r.sp); z80._r.sp++; z80._r.b = MMU.rb(z80._r.sp); z80._r.sp++; z80._r.m = 3; z80._r.t = 12; },
    POPDE: function () { z80._r.e = MMU.rb(z80._r.sp); z80._r.sp++; z80._r.d = MMU.rb(z80._r.sp); z80._r.sp++; z80._r.m = 3; z80._r.t = 12; },
    POPHL: function () { z80._r.l = MMU.rb(z80._r.sp); z80._r.sp++; z80._r.h = MMU.rb(z80._r.sp); z80._r.sp++; z80._r.m = 3; z80._r.t = 12; },
    POPAF: function () { z80._r.f = MMU.rb(z80._r.sp); z80._r.sp++; z80._r.a = MMU.rb(z80._r.sp); z80._r.sp++; z80._r.m = 3; z80._r.t = 12; },

    /*--- Jump ---*/
    JPnn: function () { z80._r.pc = MMU.rw(z80._r.pc); z80._r.m = 3; z80._r.t = 12; },
    JPHL: function () { z80._r.pc = z80._r.hl; z80._r.m = 1; z80._r.t = 4; },
    JPNZnn: function () { z80._r.m = 3; z80._r.t = 12; if ((z80._r.f & 0x80) == 0x00) { z80._r.pc = MMU.rw(z80._r.pc); z80._r.m++; z80._r.t += 4; } else z80._r.pc += 2; },
    JPZnn: function () { z80._r.m = 3; z80._r.t = 12; if ((z80._r.f & 0x80) == 0x80) { z80._r.pc = MMU.rw(z80._r.pc); z80._r.m++; z80._r.t += 4; } else z80._r.pc += 2; },
    JPNCnn: function () { z80._r.m = 3; z80._r.t = 12; if ((z80._r.f & 0x10) == 0x00) { z80._r.pc = MMU.rw(z80._r.pc); z80._r.m++; z80._r.t += 4; } else z80._r.pc += 2; },
    JPCnn: function () { z80._r.m = 3; z80._r.t = 12; if ((z80._r.f & 0x10) == 0x10) { z80._r.pc = MMU.rw(z80._r.pc); z80._r.m++; z80._r.t += 4; } else z80._r.pc += 2; },

    JRn: function () { var i = MMU.rb(z80._r.pc); if (i > 127) i = -((~i + 1) & 255); z80._r.pc++; z80._r.m = 2; z80._r.t = 8; z80._r.pc += i; z80._r.m++; z80._r.t += 4; },
    JRNZn: function () { var i = MMU.rb(z80._r.pc); if (i > 127) i = -((~i + 1) & 255); z80._r.pc++; z80._r.m = 2; z80._r.t = 8; if ((z80._r.f & 0x80) == 0x00) { z80._r.pc += i; z80._r.m++; z80._r.t += 4; } },
    JRZn: function () { var i = MMU.rb(z80._r.pc); if (i > 127) i = -((~i + 1) & 255); z80._r.pc++; z80._r.m = 2; z80._r.t = 8; if ((z80._r.f & 0x80) == 0x80) { z80._r.pc += i; z80._r.m++; z80._r.t += 4; } },
    JRNCn: function () { var i = MMU.rb(z80._r.pc); if (i > 127) i = -((~i + 1) & 255); z80._r.pc++; z80._r.m = 2; z80._r.t = 8; if ((z80._r.f & 0x10) == 0x00) { z80._r.pc += i; z80._r.m++; z80._r.t += 4; } },
    JRCn: function () { var i = MMU.rb(z80._r.pc); if (i > 127) i = -((~i + 1) & 255); z80._r.pc++; z80._r.m = 2; z80._r.t = 8; if ((z80._r.f & 0x10) == 0x10) { z80._r.pc += i; z80._r.m++; z80._r.t += 4; } },

    DJNZn: function () { var i = MMU.rb(z80._r.pc); if (i > 127) i = -((~i + 1) & 255); z80._r.pc++; z80._r.m = 2; z80._r.t = 8; z80._r.b--; if (z80._r.b) { z80._r.pc += i; z80._r.m++; z80._r.t += 4; } },

    CALLnn: function () { z80._r.sp -= 2; MMU.ww(z80._r.sp, z80._r.pc + 2); z80._r.pc = MMU.rw(z80._r.pc); z80._r.m = 5; z80._r.t = 20; },
    CALLNZnn: function () { z80._r.m = 3; z80._r.t = 12; if ((z80._r.f & 0x80) == 0x00) { z80._r.sp -= 2; MMU.ww(z80._r.sp, z80._r.pc + 2); z80._r.pc = MMU.rw(z80._r.pc); z80._r.m += 2; z80._r.t += 8; } else z80._r.pc += 2; },
    CALLZnn: function () { z80._r.m = 3; z80._r.t = 12; if ((z80._r.f & 0x80) == 0x80) { z80._r.sp -= 2; MMU.ww(z80._r.sp, z80._r.pc + 2); z80._r.pc = MMU.rw(z80._r.pc); z80._r.m += 2; z80._r.t += 8; } else z80._r.pc += 2; },
    CALLNCnn: function () { z80._r.m = 3; z80._r.t = 12; if ((z80._r.f & 0x10) == 0x00) { z80._r.sp -= 2; MMU.ww(z80._r.sp, z80._r.pc + 2); z80._r.pc = MMU.rw(z80._r.pc); z80._r.m += 2; z80._r.t += 8; } else z80._r.pc += 2; },
    CALLCnn: function () { z80._r.m = 3; z80._r.t = 12; if ((z80._r.f & 0x10) == 0x10) { z80._r.sp -= 2; MMU.ww(z80._r.sp, z80._r.pc + 2); z80._r.pc = MMU.rw(z80._r.pc); z80._r.m += 2; z80._r.t += 8; } else z80._r.pc += 2; },

    RET: function () { z80._r.pc = MMU.rw(z80._r.sp); z80._r.sp += 2; z80._r.m = 3; z80._r.t = 12; },
    RETI: function () { z80._r.ime = 1; z80._r.pc = MMU.rw(z80._r.sp); z80._r.sp += 2; z80._r.m = 3; z80._r.t = 12; },
    RETNZ: function () { z80._r.m = 1; z80._r.t = 4; if ((z80._r.f & 0x80) == 0x00) { z80._r.pc = MMU.rw(z80._r.sp); z80._r.sp += 2; z80._r.m += 2; z80._r.t += 8; } },
    RETZ: function () { z80._r.m = 1; z80._r.t = 4; if ((z80._r.f & 0x80) == 0x80) { z80._r.pc = MMU.rw(z80._r.sp); z80._r.sp += 2; z80._r.m += 2; z80._r.t += 8; } },
    RETNC: function () { z80._r.m = 1; z80._r.t = 4; if ((z80._r.f & 0x10) == 0x00) { z80._r.pc = MMU.rw(z80._r.sp); z80._r.sp += 2; z80._r.m += 2; z80._r.t += 8; } },
    RETC: function () { z80._r.m = 1; z80._r.t = 4; if ((z80._r.f & 0x10) == 0x10) { z80._r.pc = MMU.rw(z80._r.sp); z80._r.sp += 2; z80._r.m += 2; z80._r.t += 8; } },

    RST00: function () { z80._r.sp -= 2; MMU.ww(z80._r.sp, z80._r.pc); z80._r.pc = 0x00; z80._r.m = 3; z80._r.t = 12; },
    RST08: function () { z80._r.sp -= 2; MMU.ww(z80._r.sp, z80._r.pc); z80._r.pc = 0x08; z80._r.m = 3; z80._r.t = 12; },
    RST10: function () { z80._r.sp -= 2; MMU.ww(z80._r.sp, z80._r.pc); z80._r.pc = 0x10; z80._r.m = 3; z80._r.t = 12; },
    RST18: function () { z80._r.sp -= 2; MMU.ww(z80._r.sp, z80._r.pc); z80._r.pc = 0x18; z80._r.m = 3; z80._r.t = 12; },
    RST20: function () { z80._r.sp -= 2; MMU.ww(z80._r.sp, z80._r.pc); z80._r.pc = 0x20; z80._r.m = 3; z80._r.t = 12; },
    RST28: function () { z80._r.sp -= 2; MMU.ww(z80._r.sp, z80._r.pc); z80._r.pc = 0x28; z80._r.m = 3; z80._r.t = 12; },
    RST30: function () { z80._r.sp -= 2; MMU.ww(z80._r.sp, z80._r.pc); z80._r.pc = 0x30; z80._r.m = 3; z80._r.t = 12; },
    RST38: function () { z80._r.sp -= 2; MMU.ww(z80._r.sp, z80._r.pc); z80._r.pc = 0x38; z80._r.m = 3; z80._r.t = 12; },
    RST40: function () { z80._r.sp -= 2; MMU.ww(z80._r.sp, z80._r.pc); z80._r.pc = 0x40; z80._r.m = 3; z80._r.t = 12; },
    RST48: function () { z80._r.sp -= 2; MMU.ww(z80._r.sp, z80._r.pc); z80._r.pc = 0x48; z80._r.m = 3; z80._r.t = 12; },
    RST50: function () { z80._r.sp -= 2; MMU.ww(z80._r.sp, z80._r.pc); z80._r.pc = 0x50; z80._r.m = 3; z80._r.t = 12; },
    RST58: function () { z80._r.sp -= 2; MMU.ww(z80._r.sp, z80._r.pc); z80._r.pc = 0x58; z80._r.m = 3; z80._r.t = 12; },
    RST60: function () { z80._r.sp -= 2; MMU.ww(z80._r.sp, z80._r.pc); z80._r.pc = 0x60; z80._r.m = 3; z80._r.t = 12; },

    NOP: function () { z80._r.m = 1; z80._r.t = 4; },
    HALT: function () { z80._halt = 1; z80._r.m = 1; z80._r.t = 4; },

    DI: function () { z80._r.ime = 0; z80._r.m = 1; z80._r.t = 4; },
    EI: function () { z80._r.ime = 1; z80._r.m = 1; z80._r.t = 4; },

    /*--- Helper functions ---*/
    fz: function (i: any, as?: any) { z80._r.f = 0; if (!(i & 255)) z80._r.f |= 128; z80._r.f |= as ? 0x40 : 0; },

    MAPcb: function () {
      var i = MMU.rb(z80._r.pc); z80._r.pc++;
      z80._r.pc &= 65535;
      if (z80._cbmap[i]) z80._cbmap[i]();
      else alert(i);
    },

    XX: function () {
      /*Undefined map entry*/
      var opc = z80._r.pc - 1;
      alert('Unimplemented instruction at $' + opc.toString(16) + ', stopping.');
      z80._stop = 1;
    }
  },

  _map: [] as any[],
  _cbmap: [] as any[]
}

// while(true) {
//   let op = MMU.rb(z80._r.pc++);                 // Fech instruction
//   z80._map[op]();                               // Dispatch
//   z80._r.pc &= 65535;                           // Mask PC to 16 bits
//   z80._clock.m += z80._r.m;                     // Add time to CPU clock
//   z80._clock.t += z80._r.t;
// }

z80._map = [
  // 00
  z80._ops.NOP,
  z80._ops.LDBCnn,
  z80._ops.LDBCmA,
  z80._ops.INCBC,
  z80._ops.INCr_b,
  z80._ops.DECr_b,
  z80._ops.LDrn_b,
  z80._ops.RLCA,
  z80._ops.LDmmSP,
  z80._ops.ADDHLBC,
  z80._ops.LDABCm,
  z80._ops.DECBC,
  z80._ops.INCr_c,
  z80._ops.DECr_c,
  z80._ops.LDrn_c,
  z80._ops.RRCA,

  // 10
  z80._ops.DJNZn,
  z80._ops.LDDEnn,
  z80._ops.LDDEmA,
  z80._ops.INCDE,
  z80._ops.INCr_d,
  z80._ops.DECr_d,
  z80._ops.LDrn_d,
  z80._ops.RLA,
  z80._ops.JRn,
  z80._ops.ADDHLDE,
  z80._ops.LDADEm,
  z80._ops.DECDE,
  z80._ops.INCr_e,
  z80._ops.DECr_e,
  z80._ops.LDrn_e,
  z80._ops.RRA,

  // 20
  z80._ops.JRNZn,
  z80._ops.LDHLnn,
  z80._ops.LDHLIA,
  z80._ops.INCHL,
  z80._ops.INCr_h,
  z80._ops.DECr_h,
  z80._ops.LDrn_h,
  z80._ops.XX,
  z80._ops.JRZn,
  z80._ops.ADDHLHL,
  z80._ops.LDAHLI,
  z80._ops.DECHL,
  z80._ops.INCr_l,
  z80._ops.DECr_l,
  z80._ops.LDrn_l,
  z80._ops.CPL,

  // 30
  z80._ops.JRNCn,
  z80._ops.LDSPnn,
  z80._ops.LDHLDA,
  z80._ops.INCSP,
  z80._ops.INCHLm,
  z80._ops.DECHLm,
  z80._ops.LDHLmn,
  z80._ops.SCF,
  z80._ops.JRCn,
  z80._ops.ADDHLSP,
  z80._ops.LDAHLD,
  z80._ops.DECSP,
  z80._ops.INCr_a,
  z80._ops.DECr_a,
  z80._ops.LDrn_a,
  z80._ops.CCF,

  // 40
  z80._ops.LDrr_bb,
  z80._ops.LDrr_bc,
  z80._ops.LDrr_bd,
  z80._ops.LDrr_be,
  z80._ops.LDrr_bh,
  z80._ops.LDrr_bl,
  z80._ops.LDrHLm_b,
  z80._ops.LDrr_ba,
  z80._ops.LDrr_cb,
  z80._ops.LDrr_cc,
  z80._ops.LDrr_cd,
  z80._ops.LDrr_ce,
  z80._ops.LDrr_ch,
  z80._ops.LDrr_cl,
  z80._ops.LDrHLm_c,
  z80._ops.LDrr_ca,

  // 50
  z80._ops.LDrr_db,
  z80._ops.LDrr_dc,
  z80._ops.LDrr_dd,
  z80._ops.LDrr_de,
  z80._ops.LDrr_dh,
  z80._ops.LDrr_dl,
  z80._ops.LDrHLm_d,
  z80._ops.LDrr_da,
  z80._ops.LDrr_eb,
  z80._ops.LDrr_ec,
  z80._ops.LDrr_ed,
  z80._ops.LDrr_ee,
  z80._ops.LDrr_eh,
  z80._ops.LDrr_el,
  z80._ops.LDrHLm_e,
  z80._ops.LDrr_ea,

  // 60
  z80._ops.LDrr_hb,
  z80._ops.LDrr_hc,
  z80._ops.LDrr_hd,
  z80._ops.LDrr_he,
  z80._ops.LDrr_hh,
  z80._ops.LDrr_hl,
  z80._ops.LDrHLm_h,
  z80._ops.LDrr_ha,
  z80._ops.LDrr_lb,
  z80._ops.LDrr_lc,
  z80._ops.LDrr_ld,
  z80._ops.LDrr_le,
  z80._ops.LDrr_lh,
  z80._ops.LDrr_ll,
  z80._ops.LDrHLm_l,
  z80._ops.LDrr_la,

  // 70
  z80._ops.LDHLmr_b,
  z80._ops.LDHLmr_c,
  z80._ops.LDHLmr_d,
  z80._ops.LDHLmr_e,
  z80._ops.LDHLmr_h,
  z80._ops.LDHLmr_l,
  z80._ops.HALT,
  z80._ops.LDHLmr_a,
  z80._ops.LDrr_ab,
  z80._ops.LDrr_ac,
  z80._ops.LDrr_ad,
  z80._ops.LDrr_ae,
  z80._ops.LDrr_ah,
  z80._ops.LDrr_al,
  z80._ops.LDrHLm_a,
  z80._ops.LDrr_aa,

  // 80
  z80._ops.ADDr_b,
  z80._ops.ADDr_c,
  z80._ops.ADDr_d,
  z80._ops.ADDr_e,
  z80._ops.ADDr_h,
  z80._ops.ADDr_l,
  z80._ops.ADDHL,
  z80._ops.ADDr_a,
  z80._ops.ADCr_b,
  z80._ops.ADCr_c,
  z80._ops.ADCr_d,
  z80._ops.ADCr_e,
  z80._ops.ADCr_h,
  z80._ops.ADCr_l,
  z80._ops.ADCHL,
  z80._ops.ADCr_a,

  // 90
  z80._ops.SUBr_b,
  z80._ops.SUBr_c,
  z80._ops.SUBr_d,
  z80._ops.SUBr_e,
  z80._ops.SUBr_h,
  z80._ops.SUBr_l,
  z80._ops.SUBHL,
  z80._ops.SUBr_a,
  z80._ops.SBCr_b,
  z80._ops.SBCr_c,
  z80._ops.SBCr_d,
  z80._ops.SBCr_e,
  z80._ops.SBCr_h,
  z80._ops.SBCr_l,
  z80._ops.SBCHL,
  z80._ops.SBCr_a,

  // A0
  z80._ops.ANDr_b,
  z80._ops.ANDr_c,
  z80._ops.ANDr_d,
  z80._ops.ANDr_e,
  z80._ops.ANDr_h,
  z80._ops.ANDr_l,
  z80._ops.ANDHL,
  z80._ops.ANDr_a,
  z80._ops.XORr_b,
  z80._ops.XORr_c,
  z80._ops.XORr_d,
  z80._ops.XORr_e,
  z80._ops.XORr_h,
  z80._ops.XORr_l,
  z80._ops.XORHL,
  z80._ops.XORr_a,

  // B0
  z80._ops.ORr_b,
  z80._ops.ORr_c,
  z80._ops.ORr_d,
  z80._ops.ORr_e,
  z80._ops.ORr_h,
  z80._ops.ORr_l,
  z80._ops.ORHL,
  z80._ops.ORr_a,
  z80._ops.CPr_b,
  z80._ops.CPr_c,
  z80._ops.CPr_d,
  z80._ops.CPr_e,
  z80._ops.CPr_h,
  z80._ops.CPr_l,
  z80._ops.CPHL,
  z80._ops.CPr_a,

  // C0
  z80._ops.RETNZ,
  z80._ops.POPBC,
  z80._ops.JPNZnn,
  z80._ops.JPnn,
  z80._ops.CALLNZnn,
  z80._ops.PUSHBC,
  z80._ops.ADDn,
  z80._ops.RST00,
  z80._ops.RETZ,
  z80._ops.RET,
  z80._ops.JPZnn,
  z80._ops.MAPcb,
  z80._ops.CALLZnn,
  z80._ops.CALLnn,
  z80._ops.ADCn,
  z80._ops.RST08,

  // D0
  z80._ops.RETNC,
  z80._ops.POPDE,
  z80._ops.JPNCnn,
  z80._ops.XX,
  z80._ops.CALLNCnn,
  z80._ops.PUSHDE,
  z80._ops.SUBn,
  z80._ops.RST10,
  z80._ops.RETC,
  z80._ops.RETI,
  z80._ops.JPCnn,
  z80._ops.XX,
  z80._ops.CALLCnn,
  z80._ops.XX,
  z80._ops.SBCn,
  z80._ops.RST18,

  // E0
  z80._ops.LDIOnA,
  z80._ops.POPHL,
  z80._ops.LDIOCA,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.PUSHHL,
  z80._ops.ANDn,
  z80._ops.RST20,
  z80._ops.ADDSPn,
  z80._ops.JPHL,
  z80._ops.LDmmA,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.ORn,
  z80._ops.RST28,

  // F0
  z80._ops.LDAIOn,
  z80._ops.POPAF,
  z80._ops.LDAIOC,
  z80._ops.DI,
  z80._ops.XX,
  z80._ops.PUSHAF,
  z80._ops.XORn,
  z80._ops.RST30,
  z80._ops.LDHLSPn,
  z80._ops.XX,
  z80._ops.LDAmm,
  z80._ops.EI,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.CPn,
  z80._ops.RST38
];

z80._cbmap = [
  // CB00
  z80._ops.RLCr_b,
  z80._ops.RLCr_c,
  z80._ops.RLCr_d,
  z80._ops.RLCr_e,
  z80._ops.RLCr_h,
  z80._ops.RLCr_l,
  z80._ops.RLCHL,
  z80._ops.RLCr_a,
  z80._ops.RRCr_b,
  z80._ops.RRCr_c,
  z80._ops.RRCr_d,
  z80._ops.RRCr_e,
  z80._ops.RRCr_h,
  z80._ops.RRCr_l,
  z80._ops.RRCHL,
  z80._ops.RRCr_a,

  // CB10
  z80._ops.RLr_b,
  z80._ops.RLr_c,
  z80._ops.RLr_d,
  z80._ops.RLr_e,
  z80._ops.RLr_h,
  z80._ops.RLr_l,
  z80._ops.RLHL,
  z80._ops.RLr_a,
  z80._ops.RRr_b,
  z80._ops.RRr_c,
  z80._ops.RRr_d,
  z80._ops.RRr_e,
  z80._ops.RRr_h,
  z80._ops.RRr_l,
  z80._ops.RRHL,
  z80._ops.RRr_a,

  // CB20
  z80._ops.SLAr_b,
  z80._ops.SLAr_c,
  z80._ops.SLAr_d,
  z80._ops.SLAr_e,
  z80._ops.SLAr_h,
  z80._ops.SLAr_l,
  z80._ops.XX,
  z80._ops.SLAr_a,
  z80._ops.SRAr_b,
  z80._ops.SRAr_c,
  z80._ops.SRAr_d,
  z80._ops.SRAr_e,
  z80._ops.SRAr_h,
  z80._ops.SRAr_l,
  z80._ops.XX,
  z80._ops.SRAr_a,

  // CB30
  z80._ops.SWAPr_b,
  z80._ops.SWAPr_c,
  z80._ops.SWAPr_d,
  z80._ops.SWAPr_e,
  z80._ops.SWAPr_h,
  z80._ops.SWAPr_l,
  z80._ops.XX,
  z80._ops.SWAPr_a,
  z80._ops.SRLr_b,
  z80._ops.SRLr_c,
  z80._ops.SRLr_d,
  z80._ops.SRLr_e,
  z80._ops.SRLr_h,
  z80._ops.SRLr_l,
  z80._ops.XX,
  z80._ops.SRLr_a,

  // CB40
  z80._ops.BIT0b,
  z80._ops.BIT0c,
  z80._ops.BIT0d,
  z80._ops.BIT0e,
  z80._ops.BIT0h,
  z80._ops.BIT0l,
  z80._ops.BIT0m,
  z80._ops.BIT0a,
  z80._ops.BIT1b,
  z80._ops.BIT1c,
  z80._ops.BIT1d,
  z80._ops.BIT1e,
  z80._ops.BIT1h,
  z80._ops.BIT1l,
  z80._ops.BIT1m,
  z80._ops.BIT1a,

  // CB50
  z80._ops.BIT2b,
  z80._ops.BIT2c,
  z80._ops.BIT2d,
  z80._ops.BIT2e,
  z80._ops.BIT2h,
  z80._ops.BIT2l,
  z80._ops.BIT2m,
  z80._ops.BIT2a,
  z80._ops.BIT3b,
  z80._ops.BIT3c,
  z80._ops.BIT3d,
  z80._ops.BIT3e,
  z80._ops.BIT3h,
  z80._ops.BIT3l,
  z80._ops.BIT3m,
  z80._ops.BIT3a,

  // CB60
  z80._ops.BIT4b,
  z80._ops.BIT4c,
  z80._ops.BIT4d,
  z80._ops.BIT4e,
  z80._ops.BIT4h,
  z80._ops.BIT4l,
  z80._ops.BIT4m,
  z80._ops.BIT4a,
  z80._ops.BIT5b,
  z80._ops.BIT5c,
  z80._ops.BIT5d,
  z80._ops.BIT5e,
  z80._ops.BIT5h,
  z80._ops.BIT5l,
  z80._ops.BIT5m,
  z80._ops.BIT5a,

  // CB70
  z80._ops.BIT6b,
  z80._ops.BIT6c,
  z80._ops.BIT6d,
  z80._ops.BIT6e,
  z80._ops.BIT6h,
  z80._ops.BIT6l,
  z80._ops.BIT6m,
  z80._ops.BIT6a,
  z80._ops.BIT7b,
  z80._ops.BIT7c,
  z80._ops.BIT7d,
  z80._ops.BIT7e,
  z80._ops.BIT7h,
  z80._ops.BIT7l,
  z80._ops.BIT7m,
  z80._ops.BIT7a,

  // CB80
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,

  // CB90
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,

  // CBA0
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,

  // CBB0
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,

  // CBC0
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,

  // CBD0
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,

  // CBE0
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,

  // CBF0
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX,
  z80._ops.XX
];
