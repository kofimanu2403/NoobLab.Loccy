/*
 * gLong.js extracted/adapted for NoobLab legacy doppio support.
 * Original from Doppio / Google Closure Long.
 */
(function(global) {
  function gLong(low, high) {
    this.low_ = low | 0;
    this.high_ = high | 0;
  }
  gLong.fromInt = function(value) {
    return new gLong(value | 0, value < 0 ? -1 : 0);
  };
  gLong.fromNumber = function(value) {
    if (isNaN(value) || !isFinite(value)) return gLong.ZERO;
    if (value <= -gLong.TWO_PWR_63_DBL_) return gLong.MIN_VALUE;
    if (value + 1 >= gLong.TWO_PWR_63_DBL_) return gLong.MAX_VALUE;
    if (value < 0) return gLong.fromNumber(-value).negate();
    return new gLong((value % gLong.TWO_PWR_32_DBL_) | 0, (value / gLong.TWO_PWR_32_DBL_) | 0);
  };
  gLong.fromBits = function(lowBits, highBits) { return new gLong(lowBits, highBits); };
  gLong.ZERO = gLong.fromInt(0);
  gLong.ONE = gLong.fromInt(1);
  gLong.NEG_ONE = gLong.fromInt(-1);
  gLong.MAX_VALUE = gLong.fromBits(0xFFFFFFFF | 0, 0x7FFFFFFF | 0);
  gLong.MIN_VALUE = gLong.fromBits(0, 0x80000000 | 0);
  gLong.TWO_PWR_24_ = gLong.fromInt(1 << 24);
  gLong.TWO_PWR_32_DBL_ = (1 << 16) * (1 << 16);
  gLong.TWO_PWR_63_DBL_ = (1 << 63);
  gLong.prototype.toInt = function() { return this.low_; };
  gLong.prototype.toNumber = function() {
    return this.high_ * gLong.TWO_PWR_32_DBL_ + (this.low_ >>> 0);
  };
  gLong.prototype.isZero = function() { return this.high_ === 0 && this.low_ === 0; };
  gLong.prototype.isNegative = function() { return this.high_ < 0; };
  gLong.prototype.isOdd = function() { return (this.low_ & 1) === 1; };
  gLong.prototype.equals = function(other) { return (this.high_ === other.high_) && (this.low_ === other.low_); };
  gLong.prototype.notEquals = function(other) { return !this.equals(other); };
  gLong.prototype.lessThan = function(other) { return this.compare(other) < 0; };
  gLong.prototype.lessThanOrEqual = function(other) { return this.compare(other) <= 0; };
  gLong.prototype.greaterThan = function(other) { return this.compare(other) > 0; };
  gLong.prototype.greaterThanOrEqual = function(other) { return this.compare(other) >= 0; };
  gLong.prototype.compare = function(other) {
    if (this.equals(other)) return 0;
    var thisNeg = this.isNegative();
    var otherNeg = other.isNegative();
    if (thisNeg && !otherNeg) return -1;
    if (!thisNeg && otherNeg) return 1;
    var res = this.subtract(other);
    if (res.isNegative()) return -1;
    return 1;
  };
  gLong.prototype.negate = function() {
    if (this.equals(gLong.MIN_VALUE)) return gLong.MIN_VALUE;
    return this.not().add(gLong.ONE);
  };
  gLong.prototype.add = function(other) {
    var a48 = this.high_ >>> 16;
    var a32 = this.high_ & 0xFFFF;
    var a16 = this.low_ >>> 16;
    var a00 = this.low_ & 0xFFFF;
    var b48 = other.high_ >>> 16;
    var b32 = other.high_ & 0xFFFF;
    var b16 = other.low_ >>> 16;
    var b00 = other.low_ & 0xFFFF;
    var c48 = 0, c32 = 0, c16 = 0, c00 = 0;
    c00 += a00 + b00;
    c16 += c00 >>> 16;
    c00 &= 0xFFFF;
    c16 += a16 + b16;
    c32 += c16 >>> 16;
    c16 &= 0xFFFF;
    c32 += a32 + b32;
    c48 += c32 >>> 16;
    c32 &= 0xFFFF;
    c48 += a48 + b48;
    c48 &= 0xFFFF;
    return gLong.fromBits((c16 << 16) | c00, (c48 << 16) | c32);
  };
  gLong.prototype.subtract = function(other) { return this.add(other.negate()); };
  gLong.prototype.multiply = function(other) {
    if (this.isZero()) return gLong.ZERO;
    if (other.isZero()) return gLong.ZERO;
    if (this.equals(gLong.MIN_VALUE)) return other.isOdd() ? gLong.MIN_VALUE : gLong.ZERO;
    if (other.equals(gLong.MIN_VALUE)) return this.isOdd() ? gLong.MIN_VALUE : gLong.ZERO;
    if (this.isNegative()) {
      if (other.isNegative()) return this.negate().multiply(other.negate());
      else return this.negate().multiply(other).negate();
    } else if (other.isNegative()) return this.multiply(other.negate()).negate();
    if (this.lessThan(gLong.TWO_PWR_24_) && other.lessThan(gLong.TWO_PWR_24_)) {
      return gLong.fromNumber(this.toNumber() * other.toNumber());
    }
    var a48 = this.high_ >>> 16;
    var a32 = this.high_ & 0xFFFF;
    var a16 = this.low_ >>> 16;
    var a00 = this.low_ & 0xFFFF;
    var b48 = other.high_ >>> 16;
    var b32 = other.high_ & 0xFFFF;
    var b16 = other.low_ >>> 16;
    var b00 = other.low_ & 0xFFFF;
    var c48 = 0, c32 = 0, c16 = 0, c00 = 0;
    c00 += a00 * b00;
    c16 += c00 >>> 16;
    c00 &= 0xFFFF;
    c16 += a16 * b00;
    c32 += c16 >>> 16;
    c16 &= 0xFFFF;
    c16 += a00 * b16;
    c32 += c16 >>> 16;
    c16 &= 0xFFFF;
    c32 += a32 * b00;
    c48 += c32 >>> 16;
    c32 &= 0xFFFF;
    c32 += a16 * b16;
    c48 += c32 >>> 16;
    c32 &= 0xFFFF;
    c32 += a00 * b32;
    c48 += c32 >>> 16;
    c32 &= 0xFFFF;
    c48 += a48 * b00 + a32 * b16 + a16 * b32 + a00 * b48;
    c48 &= 0xFFFF;
    return gLong.fromBits((c16 << 16) | c00, (c48 << 16) | c32);
  };
  gLong.prototype.div = function(other) {
    if (other.isZero()) throw new Error('division by zero');
    if (this.isZero()) return gLong.ZERO;
    var approx, rem, res;
    if (this.equals(gLong.MIN_VALUE)) {
      if (other.equals(gLong.ONE) || other.equals(gLong.NEG_ONE)) return gLong.MIN_VALUE;
      if (other.equals(gLong.MIN_VALUE)) return gLong.ONE;
      var halfThis = this.shiftRight(1);
      approx = halfThis.div(other).shiftLeft(1);
      if (approx.equals(gLong.ZERO)) {
        return other.isNegative() ? gLong.ONE : gLong.NEG_ONE;
      }
      rem = this.subtract(other.multiply(approx));
      res = approx.add(rem.div(other));
      return res;
    }
    if (other.equals(gLong.MIN_VALUE)) return gLong.ZERO;
    if (this.isNegative()) {
      if (other.isNegative()) return this.negate().div(other.negate());
      return this.negate().div(other).negate();
    } else if (other.isNegative()) return this.div(other.negate()).negate();
    res = gLong.ZERO;
    rem = this;
    while (rem.greaterThanOrEqual(other)) {
      approx = Math.max(1, Math.floor(rem.toNumber() / other.toNumber()));
      var log2 = Math.ceil(Math.log(approx) / Math.LN2);
      var delta = (log2 <= 48) ? 1 : Math.pow(2, log2 - 48);
      var approxRes = gLong.fromNumber(approx);
      var approxRem = approxRes.multiply(other);
      while (approxRem.isNegative() || approxRem.greaterThan(rem)) {
        approx -= delta;
        approxRes = gLong.fromNumber(approx);
        approxRem = approxRes.multiply(other);
      }
      if (approxRes.isZero()) approxRes = gLong.ONE;
      res = res.add(approxRes);
      rem = rem.subtract(approxRem);
    }
    return res;
  };
  gLong.prototype.modulo = function(other) { return this.subtract(this.div(other).multiply(other)); };
  gLong.prototype.not = function() { return gLong.fromBits(~this.low_, ~this.high_); };
  gLong.prototype.and = function(other) { return gLong.fromBits(this.low_ & other.low_, this.high_ & other.high_); };
  gLong.prototype.or = function(other) { return gLong.fromBits(this.low_ | other.low_, this.high_ | other.high_); };
  gLong.prototype.xor = function(other) { return gLong.fromBits(this.low_ ^ other.low_, this.high_ ^ other.high_); };
  gLong.prototype.shiftLeft = function(numBits) {
    numBits &= 63;
    if (numBits === 0) return this;
    else if (numBits < 32) return gLong.fromBits(this.low_ << numBits, (this.high_ << numBits) | (this.low_ >>> (32 - numBits)));
    else return gLong.fromBits(0, this.low_ << (numBits - 32));
  };
  gLong.prototype.shiftRight = function(numBits) {
    numBits &= 63;
    if (numBits === 0) return this;
    else if (numBits < 32) return gLong.fromBits((this.low_ >>> numBits) | (this.high_ << (32 - numBits)), this.high_ >> numBits);
    else return gLong.fromBits(this.high_ >> (numBits - 32), this.high_ >= 0 ? 0 : -1);
  };
  gLong.prototype.shiftRightUnsigned = function(numBits) {
    numBits &= 63;
    if (numBits === 0) return this;
    else if (numBits < 32) return gLong.fromBits((this.low_ >>> numBits) | (this.high_ << (32 - numBits)), this.high_ >>> numBits);
    else if (numBits === 32) return gLong.fromBits(this.high_, 0);
    else return gLong.fromBits(this.high_ >>> (numBits - 32), 0);
  };
  gLong.prototype.toString = function(radix) {
    radix = radix || 10;
    if (radix < 2 || 36 < radix) throw new Error('radix out of range: ' + radix);
    if (this.isZero()) return '0';
    if (this.isNegative()) {
      if (this.equals(gLong.MIN_VALUE)) {
        var radixLong = gLong.fromNumber(radix);
        var div = this.div(radixLong);
        var rem = div.multiply(radixLong).subtract(this);
        return div.toString(radix) + rem.toInt().toString(radix);
      }
      return '-' + this.negate().toString(radix);
    }
    var radixToPower = gLong.fromNumber(Math.pow(radix, 6));
    var rem = this;
    var result = '';
    while (true) {
      var remDiv = rem.div(radixToPower);
      var intval = rem.subtract(remDiv.multiply(radixToPower)).toInt() >>> 0;
      var digits = intval.toString(radix);
      rem = remDiv;
      if (rem.isZero()) return digits + result;
      else {
        while (digits.length < 6) digits = '0' + digits;
        result = '' + digits + result;
      }
    }
  };
  global.gLong = gLong;
  if (typeof module !== 'undefined') module.exports = gLong;
})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this);
