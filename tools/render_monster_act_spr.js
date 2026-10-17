#!/usr/bin/env node
'use strict';

// Reproducible development-time exporter for the pinned PyRO-Tools ACT/SPR fixtures.
// This does not run in the browser. Use --write to regenerate production SVGs or --check
// (the default) to prove checked-in outputs still match the fixed source binaries.

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const SOURCE_COMMIT = '1a28450df59bc69e56e70e431f9b61351bafc8f6';
const RAGASSETS_COMMIT = '4de4fa747431979d35c747d7edd549a872efd9e1';
const MONSTERS = [
  {
    key: 'lunatic',
    name: '瘋兔',
    animationType: 'idle',
    canvasWidth: 128,
    mobId: 1063,
    actPath: 'tools/samples/lunatic.act',
    sprPath: 'tools/samples/lunatic.spr',
    actSha: 'fb90ed9e0d2f71392b2f25cddb4784a09a221cca',
    sprSha: '1cdcc31c9135ede2140e0d951b59efcc1560eda2',
    actionIndex: 2,
    frames: 12,
    frameMs: 80,
    scale: 2.6,
    centerY: 76,
    outputPath: 'assets/lunatic_idle.svg',
    outputBytes: 58141,
    outputSha: '04461b2829cec9e95cdef5d11ce6140fa29ed5ed'
  },
  {
    key: 'lunatic-attack',
    name: '瘋兔',
    animationType: 'attack',
    canvasWidth: 176,
    mobId: 1063,
    actPath: 'tools/samples/lunatic.act',
    sprPath: 'tools/samples/lunatic.spr',
    actSha: 'fb90ed9e0d2f71392b2f25cddb4784a09a221cca',
    sprSha: '1cdcc31c9135ede2140e0d951b59efcc1560eda2',
    actionIndex: 18,
    frames: 19,
    frameMs: 40,
    scale: 2.6,
    centerY: 112,
    outputPath: 'assets/lunatic_attack.svg',
    outputBytes: 95667,
    outputSha: '4d1e7e2ca0ac737758adb7439f48545a3dadaed6'
  },
  {
    key: 'wolf',
    name: '狼',
    animationType: 'idle',
    canvasWidth: 128,
    mobId: 1013,
    actPath: 'tools/samples/wolf.act',
    sprPath: 'tools/samples/wolf.spr',
    actSha: '93c05e86366a7d9cfab19f59d1ff8f60dd1b617d',
    sprSha: '61b60050dce8094bbebf04d86cc87ef1e8d61706',
    actionIndex: 0,
    frames: 15,
    frameMs: 120,
    scale: 1.35,
    centerY: 76,
    outputPath: 'assets/wolf_idle.svg',
    outputBytes: 265283,
    outputSha: 'bb11db5c6f0417f2565380717ec0d0f51a8b51aa'
  },
  {
    key: 'wolf-attack',
    name: '狼',
    animationType: 'attack',
    canvasWidth: 176,
    mobId: 1013,
    actPath: 'tools/samples/wolf.act',
    sprPath: 'tools/samples/wolf.spr',
    actSha: '93c05e86366a7d9cfab19f59d1ff8f60dd1b617d',
    sprSha: '61b60050dce8094bbebf04d86cc87ef1e8d61706',
    actionIndex: 16,
    frames: 7,
    frameMs: 120,
    scale: 1.35,
    centerY: 112,
    outputPath: 'assets/wolf_attack.svg',
    outputBytes: 112050,
    outputSha: '54058111ce081c79625d91f1acc6f4dcc9ab7de0'
  },
  {
    key: 'poring-idle',
    name: '波利',
    mobId: 1002,
    animationType: 'idle',
    canvasWidth: 128,
    actPath: 'tools/samples/poring.act',
    sprPath: 'tools/samples/poring.spr',
    actSha: '26717393629e410910ff080d204e930d945328cd',
    sprSha: '406b3e91bca7137e8f7a8abcd46468f3fb639ad7',
    actionIndex: 0,
    frames: 4,
    frameMs: 160,
    scale: 2.8,
    centerY: 102,
    outputPath: 'assets/poring_idle.svg',
    outputBytes: 21378,
    outputSha: 'e7f0b0d56ca3e8997e98ebcdc8e10ccdaaae0ca8'
  },
  {
    key: 'poring-attack',
    name: '波利',
    mobId: 1002,
    animationType: 'attack',
    canvasWidth: 176,
    actPath: 'tools/samples/poring.act',
    sprPath: 'tools/samples/poring.spr',
    actSha: '26717393629e410910ff080d204e930d945328cd',
    sprSha: '406b3e91bca7137e8f7a8abcd46468f3fb639ad7',
    actionIndex: 16,
    frames: 28,
    frameMs: 40,
    scale: 2.3,
    centerY: 118,
    outputPath: 'assets/poring_attack.svg',
    outputBytes: 136944,
    outputSha: 'd550fe9a3edc83b241d882038657e6e6e1e3c916'
  },
  {
    key: 'poring-hurt',
    name: '波利',
    animationType: 'hurt',
    canvasWidth: 128,
    mobId: 1002,
    actPath: 'tools/samples/poring.act',
    sprPath: 'tools/samples/poring.spr',
    actSha: '26717393629e410910ff080d204e930d945328cd',
    sprSha: '406b3e91bca7137e8f7a8abcd46468f3fb639ad7',
    actionIndex: 24,
    frames: 5,
    frameMs: 160,
    scale: 2.8,
    centerY: 102,
    outputPath: 'assets/poring_hurt.svg',
    outputBytes: 28191,
    outputSha: '34ae789ab040f4e4b28bc5cedcdaf058fb2459ff'
  },
  {
    key: 'poring-walk',
    name: '波利',
    animationType: 'walk',
    canvasWidth: 128,
    mobId: 1002,
    actPath: 'tools/samples/poring.act',
    sprPath: 'tools/samples/poring.spr',
    actSha: '26717393629e410910ff080d204e930d945328cd',
    sprSha: '406b3e91bca7137e8f7a8abcd46468f3fb2459ff',
    actionIndex: 8,
    frames: 10,
    frameMs: 40,
    scale: 2.8,
    centerY: 102,
    outputPath: 'assets/poring_walk.svg',
    outputBytes: 50257,
    outputSha: '4d84a80fa54aed07db0eb4ceb8ffb1592adad1c9'
  },
  {
    key: 'wolf-walk',
    name: '狼',
    animationType: 'walk',
    canvasWidth: 128,
    mobId: 1013,
    actPath: 'tools/samples/wolf.act',
    sprPath: 'tools/samples/wolf.spr',
    actSha: '93c05e86366a7d9cfab19f59d1ff8f60dd1b617d',
    sprSha: '61b60050dce8094bbebf04d86cc87ef1e8d61706',
    actionIndex: 8,
    frames: 8,
    frameMs: 80,
    scale: 1.35,
    centerY: 76,
    outputPath: 'assets/wolf_walk.svg',
    outputBytes: 140374,
    outputSha: '0180f648a1d44961d2561a1d90006b1e6e45be03'
  },
  {
    key: 'green-plant',
    name: '綠色植物',
    animationType: 'idle',
    canvasWidth: 128,
    mobId: 1080,
    actPath: 'tools/samples/green_plant.act',
    sprPath: 'tools/samples/green_plant.spr',
    actSha: 'e1bda9fe10499c562baf5857ab8829d8f234bd0a',
    sprSha: '9ea4b7f257ae0b96048e9f0415e7ed7cdf08fc8a',
    actionIndex: 0,
    frames: 12,
    frameMs: 160,
    scale: 2.6,
    centerY: 76,
    outputPath: 'assets/green_plant_idle.svg',
    outputBytes: 30163,
    outputSha: 'b5442646034f744f927db495df241b560c95d435',
    staticOutputPath: 'assets/green_plant.svg',
    staticOutputBytes: 2552,
    staticOutputSha: '1f2d87a90a16161d6f101b67a11384a1a8490b6c'
  }
];

function gitBlobSha(bytes) {
  const prefix = Buffer.from('blob ' + bytes.length + '\0', 'utf8');
  return crypto.createHash('sha1').update(Buffer.concat([prefix, bytes])).digest('hex');
}

function parseSpr(bytes) {
  if (bytes.length < 8 || bytes.toString('ascii', 0, 2) !== 'SP') {
    throw new Error('SPR header/magic is invalid.');
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const indexedCount = view.getUint16(4, true);
  const trueColorCount = view.getUint16(6, true);
  if (!indexedCount || trueColorCount !== 0) {
    throw new Error('This exporter currently expects indexed-only SPR samples.');
  }
  let offset = 8;
  const sprites = [];
  for (let index = 0; index < indexedCount; index += 1) {
    if (offset + 6 > bytes.length) throw new Error('SPR frame descriptor truncated: ' + index);
    const width = view.getInt16(offset, true);
    const height = view.getInt16(offset + 2, true);
    const compressedSize = view.getUint16(offset + 4, true);
    offset += 6;
    if (width < 1 || height < 1 || offset + compressedSize > bytes.length) {
      throw new Error('SPR frame dimensions/length invalid: ' + index);
    }
    const compressed = bytes.subarray(offset, offset + compressedSize);
    offset += compressedSize;
    const pixels = [];
    let previous = null;
    for (const value of compressed) {
      // Indexed SPR uses a zero followed by a run length for transparent pixels.
      if (previous === 0) {
        if (value === 0) pixels.push(0);
        else for (let n = 0; n < value - 1; n += 1) pixels.push(0);
      } else pixels.push(value);
      previous = value;
    }
    if (pixels.length !== width * height) {
      throw new Error('SPR RLE pixel count mismatch on frame ' + index + ': ' + pixels.length + ' != ' + (width * height));
    }
    sprites.push({ width, height, pixels });
  }
  if (offset + 1024 > bytes.length) throw new Error('SPR palette truncated.');
  const palette = [];
  for (let index = 0; index < 256; index += 1) {
    palette.push([bytes[offset + index * 4], bytes[offset + index * 4 + 1], bytes[offset + index * 4 + 2]]);
  }
  return { sprites, palette, indexedCount, trueColorCount };
}

function parseAct(bytes) {
  if (bytes.length < 20 || bytes.toString('ascii', 0, 2) !== 'AC') {
    throw new Error('ACT header/magic is invalid.');
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const version = view.getUint8(2);
  const actionCount = view.getUint16(4, true);
  if ((version !== 4 && version !== 5) || actionCount < 1) {
    throw new Error('Unsupported ACT layout: version=' + version + ', actions=' + actionCount);
  }
  let offset = 16;
  const readInt = at => view.getInt32(at, true);
  const readFloat = at => view.getFloat32(at, true);
  const actions = [];
  for (let actionIndex = 0; actionIndex < actionCount; actionIndex += 1) {
    if (offset + 4 > bytes.length) throw new Error('ACT action header truncated: ' + actionIndex);
    const frameCount = readInt(offset);
    offset += 4;
    if (frameCount < 1 || frameCount > 500) throw new Error('ACT frame count invalid: ' + actionIndex);
    const frames = [];
    for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
      offset += 32; // Range1 and Range2.
      if (offset + 4 > bytes.length) throw new Error('ACT frame layer count truncated.');
      const layerCount = readInt(offset);
      offset += 4;
      if (layerCount < 0 || layerCount > 100) throw new Error('ACT layer count invalid.');
      const layers = [];
      for (let layerIndex = 0; layerIndex < layerCount; layerIndex += 1) {
        if (offset + 20 > bytes.length) throw new Error('ACT layer truncated.');
        const layer = {
          x: readInt(offset),
          y: readInt(offset + 4),
          spriteIndex: readInt(offset + 8),
          direction: readInt(offset + 12)
        };
        offset += 20; // Position, sprite index/direction, and RGBA color.
        layer.scaleX = readFloat(offset);
        offset += 4;
        if (version >= 4) {
          layer.scaleY = readFloat(offset);
          offset += 4;
        } else layer.scaleY = layer.scaleX;
        layer.rotation = readInt(offset);
        offset += 4;
        const dontJump = readInt(offset);
        offset += 4;
        if (dontJump) offset += 12;
        if (version >= 5) offset += 8;
        layers.push(layer);
      }
      offset += 8; // Event and anchor-point counts.
      if (offset > bytes.length) throw new Error('ACT frame data exceeded file length.');
      frames.push(layers);
    }
    actions.push(frames);
  }
  if (offset + 4 > bytes.length) throw new Error('ACT event count missing.');
  const eventCount = readInt(offset);
  offset += 4;
  if (eventCount < 0 || eventCount > 100) throw new Error('ACT event count invalid.');
  offset += eventCount * 40;
  if (offset + actionCount * 4 > bytes.length) throw new Error('ACT action interval table truncated.');
  const speeds = Array.from({ length: actionCount }, (_, index) => readFloat(offset + index * 4));
  return { version, actions, speeds };
}

function renderSvg(config, actBytes, sprBytes) {
  if (gitBlobSha(actBytes) !== config.actSha) throw new Error(config.key + ' ACT source Git blob SHA-1 mismatch.');
  if (gitBlobSha(sprBytes) !== config.sprSha) throw new Error(config.key + ' SPR source Git blob SHA-1 mismatch.');
  const act = parseAct(actBytes);
  const spr = parseSpr(sprBytes);
  const canvasWidth = config.canvasWidth || 128;
  const frames = act.actions[config.actionIndex];
  if (!frames || frames.length !== config.frames) {
    throw new Error(config.key + ' ACT action ' + config.actionIndex + ' frame count mismatch.');
  }
  const frameMs = Math.round(act.speeds[config.actionIndex] * 40);
  if (frameMs !== config.frameMs || frameMs < 40 || frameMs > 250) {
    throw new Error(config.key + ' ACT interval mismatch: ' + frameMs + 'ms.');
  }

  const frameLayers = frames.map((layers, frameIndex) => {
    const visibleLayers = layers.filter(layer => layer.direction === 0);
    if (!visibleLayers.length) throw new Error(config.key + ' frame ' + frameIndex + ' has no direction-0 layer.');
    return visibleLayers.map(layer => {
      const sprite = spr.sprites[layer.spriteIndex];
      if (!sprite) throw new Error(config.key + ' references missing SPR frame ' + layer.spriteIndex);
      if (Math.abs(layer.rotation) > 0.001 ||
          Math.abs(layer.scaleX - 1) > 0.001 ||
          Math.abs(layer.scaleY - 1) > 0.001) {
        throw new Error(config.key + ' ' + config.animationType + ' action uses unsupported layer transforms.');
      }
      const left = (canvasWidth - sprite.width * config.scale) / 2 + layer.x * config.scale;
      const top = config.centerY - (sprite.height * config.scale) / 2 + layer.y * config.scale;
      const pathsByColor = new Map();
      for (let y = 0; y < sprite.height; y += 1) {
        let x = 0;
        while (x < sprite.width) {
          const pixelIndex = sprite.pixels[y * sprite.width + x] || 0;
          if (pixelIndex === 0) {
            x += 1;
            continue;
          }
          const rgb = spr.palette[pixelIndex].join(',');
          let end = x + 1;
          while (end < sprite.width) {
            const nextIndex = sprite.pixels[y * sprite.width + end] || 0;
            if (nextIndex === 0 || spr.palette[nextIndex].join(',') !== rgb) break;
            end += 1;
          }
          if (!pathsByColor.has(rgb)) pathsByColor.set(rgb, []);
          pathsByColor.get(rgb).push('M' + x + ' ' + y + 'h' + (end - x) + 'v1h-' + (end - x) + 'z');
          x = end;
        }
      }
      const paths = Array.from(pathsByColor.entries()).map(([rgb, commands]) =>
        '<path fill="rgb(' + rgb + ')" d="' + commands.join('') + '"/>').join('');
      return '<g transform="translate(' + left.toFixed(3) + ' ' + top.toFixed(3) + ') scale(' + config.scale + ')">' + paths + '</g>';
    }).join('');
  });

  const duration = (frames.length * frameMs / 1000).toFixed(3);
  const pct = 100 / frames.length;
  const style = frameLayers.map((_, index) => {
    const start = index * pct;
    const end = (index + 1) * pct;
    const epsilon = 0.0001;
    let keyframes;
    if (index === frames.length - 1) {
      keyframes = '0%,' + start.toFixed(5) + '%{opacity:0}' +
        (start + epsilon).toFixed(5) + '%,100%{opacity:1}';
    } else if (index === 0) {
      keyframes = '0%,0.0001%{opacity:1}' + end.toFixed(5) + '%{opacity:1}' +
        (end + epsilon).toFixed(5) + '%,100%{opacity:0}';
    } else {
      keyframes = '0%,' + start.toFixed(5) + '%{opacity:0}' +
        (start + epsilon).toFixed(5) + '%,' + end.toFixed(5) + '%{opacity:1}' +
        (end + epsilon).toFixed(5) + '%,100%{opacity:0}';
    }
    return '@keyframes f' + index + '{' + keyframes + '}.f' + index +
      '{opacity:0;animation:f' + index + ' ' + duration + 's linear infinite}';
  }).join('');
  const groups = frameLayers.map((content, index) =>
    '<g id="frame-' + index + '" class="f' + index + '">' + content + '</g>').join('');
  const animationLabel = config.animationType === 'attack' ? '攻擊逐格動畫' :
    config.animationType === 'hurt' ? '受擊逐格動畫' :
    config.animationType === 'walk' ? '移動逐格動畫' : '待機逐格動畫';
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + canvasWidth + ' 128" role="img" aria-label="' +
    config.name + ' Mob ' + config.mobId + ' ' + animationLabel + '" data-mob-id="' + config.mobId +
    '" data-act-action-index="' + config.actionIndex + '" data-frame-count="' + frames.length +
    '" data-frame-duration-ms="' + frameMs + '"><title>' + config.name + ' · Mob ' + config.mobId +
    ' · ACT action ' + config.actionIndex + ' (' + frames.length + ' frames)</title><style>' + style +
    '</style>' + groups + '</svg>';
}


function renderStaticSvg(config, actBytes, sprBytes) {
  if (gitBlobSha(actBytes) !== config.actSha) throw new Error(config.key + ' ACT source Git blob SHA-1 mismatch.');
  if (gitBlobSha(sprBytes) !== config.sprSha) throw new Error(config.key + ' SPR source Git blob SHA-1 mismatch.');
  const act = parseAct(actBytes);
  const spr = parseSpr(sprBytes);
  const frames = act.actions[config.actionIndex];
  if (!frames || frames.length !== config.frames) {
    throw new Error(config.key + ' ACT action ' + config.actionIndex + ' frame count mismatch.');
  }
  const visibleLayers = frames[0].filter(layer => layer.direction === 0);
  if (!visibleLayers.length) throw new Error(config.key + ' first frame has no direction-0 layer.');
  const content = visibleLayers.map(layer => {
    const sprite = spr.sprites[layer.spriteIndex];
    if (!sprite) throw new Error(config.key + ' references missing SPR frame ' + layer.spriteIndex);
    if (Math.abs(layer.rotation) > 0.001 ||
        Math.abs(layer.scaleX - 1) > 0.001 ||
        Math.abs(layer.scaleY - 1) > 0.001) {
      throw new Error(config.key + ' ' + config.animationType + ' action uses unsupported layer transforms.');
    }
    const left = (config.canvasWidth - sprite.width * config.scale) / 2 + layer.x * config.scale;
    const top = config.centerY - (sprite.height * config.scale) / 2 + layer.y * config.scale;
    const pathsByColor = new Map();
    for (let y = 0; y < sprite.height; y += 1) {
      let x = 0;
      while (x < sprite.width) {
        const pixelIndex = sprite.pixels[y * sprite.width + x] || 0;
        if (pixelIndex === 0) {
          x += 1;
          continue;
        }
        const rgb = spr.palette[pixelIndex].join(',');
        let end = x + 1;
        while (end < sprite.width) {
          const nextIndex = sprite.pixels[y * sprite.width + end] || 0;
          if (nextIndex === 0 || spr.palette[nextIndex].join(',') !== rgb) break;
          end += 1;
        }
        if (!pathsByColor.has(rgb)) pathsByColor.set(rgb, []);
        pathsByColor.get(rgb).push('M' + x + ' ' + y + 'h' + (end - x) + 'v1h-' + (end - x) + 'z');
        x = end;
      }
    }
    const paths = Array.from(pathsByColor.entries()).map(([rgb, commands]) =>
      '<path fill="rgb(' + rgb + ')" d="' + commands.join('') + '"/>').join('');
    return '<g transform="translate(' + left.toFixed(3) + ' ' + top.toFixed(3) + ') scale(' + config.scale + ')">' + paths + '</g>';
  }).join('');
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" role="img" aria-label="' +
    config.name + ' Mob ' + config.mobId + ' 靜態備援" data-mob-id="' + config.mobId +
    '"><title>' + config.name + ' · Mob ' + config.mobId + ' · first verified ACT frame</title>' + content + '</svg>';
}

function main() {
  const write = process.argv.includes('--write');
  const check = process.argv.includes('--check') || !write;
  if (write && check) throw new Error('Choose either --write or --check, not both.');
  for (const config of MONSTERS) {
    const actBytes = fs.readFileSync(path.join(ROOT, config.actPath));
    const sprBytes = fs.readFileSync(path.join(ROOT, config.sprPath));
    const svg = renderSvg(config, actBytes, sprBytes);
    const outputPath = path.join(ROOT, config.outputPath);
    const outputBytes = Buffer.from(svg, 'utf8');
    if (outputBytes.length !== config.outputBytes) {
      throw new Error(config.outputPath + ' expected ' + config.outputBytes + ' bytes, generated ' + outputBytes.length + '.');
    }
    if (gitBlobSha(outputBytes) !== config.outputSha) {
      throw new Error(config.outputPath + ' generated Git blob SHA-1 differs from the pinned production output.');
    }
    if (write) {
      fs.writeFileSync(outputPath, outputBytes);
      process.stdout.write('Wrote ' + config.outputPath + ' (' + outputBytes.length + ' bytes).\n');
    } else if (check) {
      const checkedIn = fs.readFileSync(outputPath);
      if (!checkedIn.equals(outputBytes)) {
        throw new Error(config.outputPath + ' differs from deterministic ACT/SPR output; run node tools/render_monster_act_spr.js --write.');
      }
      process.stdout.write('Verified ' + config.key + ': Mob ' + config.mobId + ', action ' +
        config.actionIndex + ', ' + config.frames + ' frames at ' + config.frameMs + 'ms/frame.\n');
    }

    if (config.staticOutputPath) {
      const staticSvg = renderStaticSvg(config, actBytes, sprBytes);
      const staticOutputPath = path.join(ROOT, config.staticOutputPath);
      const staticOutputBytes = Buffer.from(staticSvg, 'utf8');
      if (staticOutputBytes.length !== config.staticOutputBytes) {
        throw new Error(config.staticOutputPath + ' expected ' + config.staticOutputBytes + ' bytes, generated ' + staticOutputBytes.length + '.');
      }
      if (gitBlobSha(staticOutputBytes) !== config.staticOutputSha) {
        throw new Error(config.staticOutputPath + ' generated Git blob SHA-1 differs from the pinned production output.');
      }
      if (write) {
        fs.writeFileSync(staticOutputPath, staticOutputBytes);
        process.stdout.write('Wrote ' + config.staticOutputPath + ' (' + staticOutputBytes.length + ' bytes).\\n');
      } else if (check) {
        const checkedStatic = fs.readFileSync(staticOutputPath);
        if (!checkedStatic.equals(staticOutputBytes)) {
          throw new Error(config.staticOutputPath + ' differs from deterministic ACT/SPR output; run node tools/render_monster_act_spr.js --write.');
        }
        process.stdout.write('Verified static fallback ' + config.key + ': Mob ' + config.mobId + '.\n');
      }
    }
  }
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    process.stderr.write((error && error.stack) || String(error));
    process.stderr.write('\n');
    process.exitCode = 1;
  }
}

module.exports = { gitBlobSha, parseAct, parseSpr, renderSvg, renderStaticSvg, MONSTERS, SOURCE_COMMIT };
