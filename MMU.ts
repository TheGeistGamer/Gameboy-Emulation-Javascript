export const MMU = {
  rb: function(addr: any): any { /* Read 8-bits byte from a given address */ },
  rw: function(addr: any): any { /* Read 16-bits word form a given address */},
  wb: function(addr: any, val: any): any { /* Write 8-bit bytes to a given address */},
  ww: function(addr: any, val: any): any { /* Write 16-bit word to a given address */}
}
