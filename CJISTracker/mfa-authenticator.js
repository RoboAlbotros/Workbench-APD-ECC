/* Microsoft Authenticator connector for the browser prototype.
   Uses the standard otpauth TOTP code (SHA-1, 6 digits, 30 seconds).
   This is not City SSO / Entra ID. HMAC runs in script so it works on HTTP. */
(function initMicrosoftAuthenticator(root) {
  const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const ISSUER = "CJIS Tracker";
  const ECC_M = [0, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22];
  const BLOCKS_M = [0, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8];
  const ALIGN = [
    [],
    [],
    [6, 18],
    [6, 22],
    [6, 26],
    [6, 30],
    [6, 34],
    [6, 22, 38],
    [6, 24, 42],
    [6, 26, 46],
    [6, 28, 50],
    [6, 30, 54],
    [6, 32, 58],
  ];

  function rotl(value, shift) {
    return ((value << shift) | (value >>> (32 - shift))) >>> 0;
  }

  function sha1(bytes) {
    const bitLen = bytes.length * 8;
    const paddedLength = ((bytes.length + 9 + 63) >> 6) << 6;
    const padded = new Uint8Array(paddedLength);
    padded.set(bytes);
    padded[bytes.length] = 0x80;
    const view = new DataView(padded.buffer);
    view.setUint32(paddedLength - 8, Math.floor(bitLen / 0x100000000), false);
    view.setUint32(paddedLength - 4, bitLen >>> 0, false);

    let h0 = 0x67452301;
    let h1 = 0xefcdab89;
    let h2 = 0x98badcfe;
    let h3 = 0x10325476;
    let h4 = 0xc3d2e1f0;
    const words = new Uint32Array(80);

    for (let offset = 0; offset < padded.length; offset += 64) {
      for (let index = 0; index < 16; index += 1) {
        words[index] = view.getUint32(offset + index * 4, false);
      }
      for (let index = 16; index < 80; index += 1) {
        const mixed = (words[index - 3] ^ words[index - 8] ^ words[index - 14] ^ words[index - 16]) >>> 0;
        words[index] = rotl(mixed, 1);
      }
      let a = h0;
      let b = h1;
      let c = h2;
      let d = h3;
      let e = h4;
      for (let index = 0; index < 80; index += 1) {
        let f = 0;
        let k = 0;
        if (index < 20) {
          f = (b & c) | (~b & d);
          k = 0x5a827999;
        } else if (index < 40) {
          f = b ^ c ^ d;
          k = 0x6ed9eba1;
        } else if (index < 60) {
          f = (b & c) | (b & d) | (c & d);
          k = 0x8f1bbcdc;
        } else {
          f = b ^ c ^ d;
          k = 0xca62c1d6;
        }
        const temp = (rotl(a, 5) + f + e + k + words[index]) >>> 0;
        e = d;
        d = c;
        c = rotl(b, 30);
        b = a;
        a = temp;
      }
      h0 = (h0 + a) >>> 0;
      h1 = (h1 + b) >>> 0;
      h2 = (h2 + c) >>> 0;
      h3 = (h3 + d) >>> 0;
      h4 = (h4 + e) >>> 0;
    }

    const digest = new Uint8Array(20);
    const digestView = new DataView(digest.buffer);
    digestView.setUint32(0, h0, false);
    digestView.setUint32(4, h1, false);
    digestView.setUint32(8, h2, false);
    digestView.setUint32(12, h3, false);
    digestView.setUint32(16, h4, false);
    return digest;
  }

  function hmacSha1(key, message) {
    const block = 64;
    let normalizedKey = key;
    if (normalizedKey.length > block) normalizedKey = sha1(normalizedKey);
    const innerPad = new Uint8Array(block);
    const outerPad = new Uint8Array(block);
    innerPad.set(normalizedKey);
    outerPad.set(normalizedKey);
    for (let index = 0; index < block; index += 1) {
      innerPad[index] ^= 0x36;
      outerPad[index] ^= 0x5c;
    }
    const inner = new Uint8Array(block + message.length);
    inner.set(innerPad);
    inner.set(message, block);
    const innerDigest = sha1(inner);
    const outer = new Uint8Array(block + innerDigest.length);
    outer.set(outerPad);
    outer.set(innerDigest, block);
    return sha1(outer);
  }

  function totpFromBytes(secretBytes, unixSeconds) {
    const counter = Math.floor(unixSeconds / 30);
    const message = new Uint8Array(8);
    let value = counter;
    for (let index = 7; index >= 0; index -= 1) {
      message[index] = value % 256;
      value = Math.floor(value / 256);
    }
    const digest = hmacSha1(secretBytes, message);
    const offset = digest[19] & 0x0f;
    const binary = ((digest[offset] & 0x7f) * 0x1000000)
      + (digest[offset + 1] * 0x10000)
      + (digest[offset + 2] * 0x100)
      + digest[offset + 3];
    return String(binary % 1000000).padStart(6, "0");
  }

  function encodeBase32(bytes) {
    let buffer = 0;
    let bits = 0;
    let output = "";
    bytes.forEach((byte) => {
      buffer = (buffer << 8) | byte;
      bits += 8;
      while (bits >= 5) {
        output += BASE32[(buffer >>> (bits - 5)) & 31];
        bits -= 5;
      }
    });
    if (bits > 0) output += BASE32[(buffer << (5 - bits)) & 31];
    return output;
  }

  function decodeBase32(text) {
    const clean = String(text || "").replace(/=+$/g, "").replace(/\s/g, "").toUpperCase();
    if (!clean || !/^[A-Z2-7]+$/.test(clean)) return new Uint8Array();
    let buffer = 0;
    let bits = 0;
    const output = [];
    for (let index = 0; index < clean.length; index += 1) {
      buffer = (buffer << 5) | BASE32.indexOf(clean[index]);
      bits += 5;
      if (bits >= 8) {
        output.push((buffer >>> (bits - 8)) & 255);
        bits -= 8;
      }
    }
    return new Uint8Array(output);
  }

  function authenticatorSelfCheck() {
    const digest = [...sha1(new TextEncoder().encode("abc"))]
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
    if (digest !== "a9993e364706816aba3e25717850c26c9cd0d89d") return false;
    const secret = new TextEncoder().encode("12345678901234567890");
    const vectors = [
      [59, "287082"],
      [1111111109, "081804"],
      [1111111111, "050471"],
      [1234567890, "005924"],
      [2000000000, "279037"],
      [20000000000, "353130"],
    ];
    return vectors.every(([unixSeconds, code]) => totpFromBytes(secret, unixSeconds) === code);
  }

  function authenticatorGenerateSecret() {
    const bytes = new Uint8Array(20);
    root.crypto.getRandomValues(bytes);
    return encodeBase32(bytes);
  }

  function authenticatorCodeAt(secret, unixSeconds) {
    return totpFromBytes(decodeBase32(secret), unixSeconds);
  }

  function authenticatorVerifyCode(secret, code, nowMs = Date.now()) {
    const normalized = String(code || "").replace(/\s/g, "");
    if (!/^\d{6}$/.test(normalized)) return false;
    const bytes = decodeBase32(secret);
    if (!bytes.length) return false;
    const unixSeconds = Math.floor(nowMs / 1000);
    return [-30, 0, 30].some((delta) => {
      const instant = unixSeconds + delta;
      return instant >= 0 && totpFromBytes(bytes, instant) === normalized;
    });
  }

  function authenticatorOtpauthUri(accountName, secret) {
    const label = `${encodeURIComponent(ISSUER)}:${encodeURIComponent(accountName)}`;
    const query = [
      `secret=${secret}`,
      `issuer=${encodeURIComponent(ISSUER)}`,
      "algorithm=SHA1",
      "digits=6",
      "period=30",
    ].join("&");
    return `otpauth://totp/${label}?${query}`;
  }

  function authenticatorFormatSecret(secret) {
    return String(secret || "").replace(/(.{4})/g, "$1 ").trim();
  }

  function gfMul(left, right) {
    let result = 0;
    for (let bit = 7; bit >= 0; bit -= 1) {
      result = (result << 1) ^ ((result >>> 7) * 0x11d);
      result ^= ((right >>> bit) & 1) * left;
      result &= 255;
    }
    return result;
  }

  function reedSolomonDivisor(degree) {
    const result = new Uint8Array(degree);
    result[degree - 1] = 1;
    let root = 1;
    for (let index = 0; index < degree; index += 1) {
      for (let position = 0; position < result.length; position += 1) {
        result[position] = gfMul(result[position], root);
        if (position + 1 < result.length) result[position] ^= result[position + 1];
      }
      root = gfMul(root, 0x02);
    }
    return result;
  }

  function reedSolomonRemainder(data, divisor) {
    const result = new Uint8Array(divisor.length);
    data.forEach((byte) => {
      const factor = byte ^ result[0];
      result.copyWithin(0, 1);
      result[result.length - 1] = 0;
      for (let index = 0; index < result.length; index += 1) {
        result[index] ^= gfMul(divisor[index], factor);
      }
    });
    return result;
  }

  function rawDataModules(version) {
    let count = (16 * version + 128) * version + 64;
    if (version >= 2) {
      const alignCount = Math.floor(version / 7) + 2;
      count -= (25 * alignCount - 10) * alignCount - 55;
      if (version >= 7) count -= 36;
    }
    return count;
  }

  function dataCapacity(version) {
    return Math.floor(rawDataModules(version) / 8) - ECC_M[version] * BLOCKS_M[version];
  }

  function appendBits(bits, value, length) {
    for (let shift = length - 1; shift >= 0; shift -= 1) {
      bits.push((value >>> shift) & 1);
    }
  }

  function encodePayload(text, version, capacity) {
    const payload = new TextEncoder().encode(text);
    const bits = [];
    appendBits(bits, 0b0100, 4);
    appendBits(bits, payload.length, version <= 9 ? 8 : 16);
    payload.forEach((byte) => appendBits(bits, byte, 8));
    const capacityBits = capacity * 8;
    const terminator = Math.min(4, Math.max(0, capacityBits - bits.length));
    appendBits(bits, 0, terminator);
    const boundary = bits.length % 8 === 0 ? 8 : 8 - (bits.length % 8);
    if (bits.length + boundary <= capacityBits) appendBits(bits, 0, boundary);
    const pads = [0xec, 0x11];
    let padIndex = 0;
    while (bits.length < capacityBits) {
      appendBits(bits, pads[padIndex], 8);
      padIndex ^= 1;
    }
    const data = [];
    for (let index = 0; index < bits.length; index += 8) {
      let value = 0;
      for (let bit = 0; bit < 8; bit += 1) value = (value << 1) | bits[index + bit];
      data.push(value);
    }
    return data;
  }

  function chooseVersion(text) {
    const length = new TextEncoder().encode(text).length;
    for (let version = 1; version < ECC_M.length; version += 1) {
      const capacityBits = dataCapacity(version) * 8;
      let bits = 4 + (version <= 9 ? 8 : 16) + length * 8;
      if (bits > capacityBits) continue;
      bits += Math.min(4, capacityBits - bits);
      const boundary = bits % 8 === 0 ? 8 : 8 - (bits % 8);
      if (bits + boundary <= capacityBits) bits += boundary;
      if (bits <= capacityBits) return version;
    }
    return 0;
  }

  function interleave(version, data) {
    const blockCount = BLOCKS_M[version];
    const eccLength = ECC_M[version];
    const rawLength = Math.floor(rawDataModules(version) / 8);
    const shortBlockCount = blockCount - (rawLength % blockCount);
    const shortDataLength = Math.floor(rawLength / blockCount) - eccLength;
    const divisor = reedSolomonDivisor(eccLength);
    const blocks = [];
    const eccBlocks = [];
    let offset = 0;
    for (let index = 0; index < blockCount; index += 1) {
      const dataLength = shortDataLength + (index < shortBlockCount ? 0 : 1);
      const block = data.slice(offset, offset + dataLength);
      offset += dataLength;
      blocks.push(block);
      eccBlocks.push(reedSolomonRemainder(block, divisor));
    }
    const output = [];
    const longest = Math.max(...blocks.map((block) => block.length));
    for (let index = 0; index < longest; index += 1) {
      blocks.forEach((block) => {
        if (index < block.length) output.push(block[index]);
      });
    }
    for (let index = 0; index < eccLength; index += 1) {
      eccBlocks.forEach((block) => output.push(block[index]));
    }
    return output;
  }

  function formatBits(mask) {
    const data = mask;
    let remainder = data;
    for (let index = 0; index < 10; index += 1) {
      remainder = (remainder << 1) ^ ((remainder >>> 9) * 0x537);
    }
    return ((data << 10) | (remainder & 0x3ff)) ^ 0x5412;
  }

  function versionBits(version) {
    let remainder = version;
    for (let index = 0; index < 12; index += 1) {
      remainder = (remainder << 1) ^ ((remainder >>> 11) * 0x1f25);
    }
    return (version << 12) | (remainder & 0xfff);
  }

  function authenticatorQrModules(text) {
    const version = chooseVersion(text);
    if (!version) throw new Error("Authenticator setup text is too long for a QR code.");
    const size = 21 + 4 * (version - 1);
    const modules = Array.from({ length: size }, () => Array(size).fill(0));
    const reserved = Array.from({ length: size }, () => Array(size).fill(false));

    function setFunction(row, column, value) {
      modules[row][column] = value ? 1 : 0;
      reserved[row][column] = true;
    }

    function drawFinder(row0, column0) {
      for (let rowDelta = -1; rowDelta <= 7; rowDelta += 1) {
        for (let columnDelta = -1; columnDelta <= 7; columnDelta += 1) {
          const row = row0 + rowDelta;
          const column = column0 + columnDelta;
          if (row < 0 || column < 0 || row >= size || column >= size) continue;
          const inside = rowDelta >= 0 && rowDelta <= 6 && columnDelta >= 0 && columnDelta <= 6;
          const dark = inside && (
            rowDelta === 0 || rowDelta === 6 || columnDelta === 0 || columnDelta === 6
            || (rowDelta >= 2 && rowDelta <= 4 && columnDelta >= 2 && columnDelta <= 4)
          );
          setFunction(row, column, dark);
        }
      }
    }

    drawFinder(0, 0);
    drawFinder(0, size - 7);
    drawFinder(size - 7, 0);

    ALIGN[version].forEach((row, rowIndex) => {
      ALIGN[version].forEach((column, columnIndex) => {
        const last = ALIGN[version].length - 1;
        const finderCorner = (rowIndex === 0 && columnIndex === 0)
          || (rowIndex === 0 && columnIndex === last)
          || (rowIndex === last && columnIndex === 0);
        if (finderCorner) return;
        for (let rowDelta = -2; rowDelta <= 2; rowDelta += 1) {
          for (let columnDelta = -2; columnDelta <= 2; columnDelta += 1) {
            const dark = Math.max(Math.abs(rowDelta), Math.abs(columnDelta)) !== 1;
            setFunction(row + rowDelta, column + columnDelta, dark);
          }
        }
      });
    });

    for (let index = 0; index < size; index += 1) {
      if (!reserved[6][index]) setFunction(6, index, index % 2 === 0);
      if (!reserved[index][6]) setFunction(index, 6, index % 2 === 0);
    }

    setFunction(size - 8, 8, 1);

    if (version >= 7) {
      const bits = versionBits(version);
      for (let index = 0; index < 18; index += 1) {
        const bit = (bits >>> index) & 1;
        const a = size - 11 + (index % 3);
        const b = Math.floor(index / 3);
        setFunction(b, a, bit);
        setFunction(a, b, bit);
      }
    }

    const formatCopies = [[], []];
    for (let index = 0; index <= 5; index += 1) formatCopies[0].push([index, 8]);
    formatCopies[0].push([7, 8], [8, 8], [8, 7]);
    for (let index = 9; index < 15; index += 1) formatCopies[0].push([8, 14 - index]);
    for (let index = 0; index < 8; index += 1) formatCopies[1].push([8, size - 1 - index]);
    for (let index = 8; index < 15; index += 1) formatCopies[1].push([size - 15 + index, 8]);
    formatCopies.flat().forEach(([row, column]) => {
      reserved[row][column] = true;
    });

    const capacity = dataCapacity(version);
    const codewords = interleave(version, encodePayload(text, version, capacity));
    let bitIndex = 0;
    for (let right = size - 1; right > 0; right -= 2) {
      const pairRight = right <= 6 ? right - 1 : right;
      for (let vertical = 0; vertical < size; vertical += 1) {
        for (let shift = 0; shift < 2; shift += 1) {
          const column = pairRight - shift;
          let upward = (pairRight & 2) === 0;
          if (column < 6) upward = !upward;
          const row = upward ? size - 1 - vertical : vertical;
          if (reserved[row][column] || bitIndex >= codewords.length * 8) continue;
          const byte = codewords[bitIndex >>> 3];
          modules[row][column] = (byte >>> (7 - (bitIndex & 7))) & 1;
          bitIndex += 1;
        }
      }
    }

    for (let row = 0; row < size; row += 1) {
      for (let column = 0; column < size; column += 1) {
        if (!reserved[row][column] && (row + column) % 2 === 0) modules[row][column] ^= 1;
      }
    }

    const bits = formatBits(0);
    formatCopies.forEach((copy) => {
      copy.forEach(([row, column], index) => {
        modules[row][column] = (bits >>> index) & 1;
      });
    });
    return modules;
  }

  function authenticatorQrSvg(text) {
    const modules = authenticatorQrModules(text);
    const quiet = 4;
    const viewSize = modules.length + quiet * 2;
    const rects = [];
    modules.forEach((row, rowIndex) => {
      row.forEach((dark, columnIndex) => {
        if (!dark) return;
        rects.push(`<rect x="${columnIndex + quiet}" y="${rowIndex + quiet}" width="1" height="1" fill="#111111"/>`);
      });
    });
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewSize} ${viewSize}" shape-rendering="crispEdges" role="img" aria-label="Microsoft Authenticator QR code"><rect width="100%" height="100%" fill="#ffffff"/>${rects.join("")}</svg>`;
  }

  root.authenticatorReady = authenticatorSelfCheck();
  root.authenticatorGenerateSecret = authenticatorGenerateSecret;
  root.authenticatorCodeAt = authenticatorCodeAt;
  root.authenticatorVerifyCode = authenticatorVerifyCode;
  root.authenticatorOtpauthUri = authenticatorOtpauthUri;
  root.authenticatorFormatSecret = authenticatorFormatSecret;
  root.authenticatorQrModules = authenticatorQrModules;
  root.authenticatorQrSvg = authenticatorQrSvg;
})(window);
