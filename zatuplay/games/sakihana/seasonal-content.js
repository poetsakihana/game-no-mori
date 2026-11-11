/*
 * SakuraSeasonal: permanent, game-created seasonal prototypes.
 * Include this script before the game engine. All coordinates are world pixels.
 * EVENTS[id] contains three collectible positions and one or two enemy gate x's.
 * drawBackdrop(ctx, id, W, H) paints a seamless 960-pixel repeating scene;
 * drawObject and drawEnemy paint at object/enemy {x,y} in the current transform.
 * The caller controls translation, collisions, completion, and one-time rewards.
 * `time` is animation time in milliseconds; all animation is slow and gentle.
 */
(function (global) {
  'use strict';
  const EVENTS = {
    summer: {
      id: 'summer', title: '海辺の花火',
      story: ['浜辺に、花火台が３つ並んでいます。', '花火台の近くで攻撃して、花火に火をつけましょう。'],
      objectiveLabel: '花火台の近くで攻撃して３つ点火', itemName: '花火台', enemyName: 'うきわカニ',
      items: [{x: 1300, y: 347}, {x: 4700, y: 398}, {x: 8100, y: 324}], gates: [3000, 6800],
      poem: {title: '波に咲く', lines: ['波がひと息', '夜にひらく小さな輪', '夏をそっと持ち帰る']},
      reward: {tickets: 2, materials: 3}, enemyColor: '#f58275'
    },
    autumn: {
      id: 'autumn', title: '秋刀魚と落ち葉',
      story: ['焼き秋刀魚の香りが、落ち葉の道を通ります。', '秋刀魚の包みに触れて、３つ集めましょう。'],
      objectiveLabel: '秋刀魚の包みに触れて３つ集める', itemName: '秋刀魚の包み', enemyName: 'ころころ栗',
      items: [{x: 1600, y: 391}, {x: 4800, y: 319}, {x: 8500, y: 407}], gates: [3400, 7100],
      poem: {title: '夕げの道', lines: ['葉っぱが回る', '香ばしい風の先', 'おかえりが待つ']},
      reward: {tickets: 2, materials: 3}, enemyColor: '#a55d38'
    },
    winter: {
      id: 'winter', title: '雪の散歩',
      story: ['白い道に、手ぶくろの灯りが並んでいます。', '回避で手ぶくろをすり抜けて、灯りをともしましょう。'],
      objectiveLabel: '手ぶくろを回避ですり抜け３つ点灯', itemName: '手ぶくろ', enemyName: 'ゆきうさぎ',
      items: [{x: 1200, y: 318}, {x: 5100, y: 405}, {x: 8800, y: 350}], gates: [4200],
      poem: {title: '白い足あと', lines: ['しんとした道', '足あとがふたつ増え', '息だけが雲になる']},
      reward: {tickets: 2, materials: 3}, enemyColor: '#b5d9e8'
    },
    holiday: {
      id: 'holiday', title: '星の贈りもの',
      story: ['星明かりの下、贈りものが光を待っています。', '箱の近くで必殺技を使い、星を輝かせましょう。'],
      objectiveLabel: '贈り物に必殺（近くで想い回復）', itemName: '星の贈りもの', enemyName: 'りぼん星',
      items: [{x: 1800, y: 371}, {x: 5300, y: 302}, {x: 8600, y: 404}], gates: [3500, 7400],
      poem: {title: 'ひとつの灯', lines: ['包みの中に', 'だれかを思う光', '星より近く灯る']},
      reward: {tickets: 2, materials: 3}, enemyColor: '#d8a7df'
    }
  };
  const get = id => EVENTS[id] || null;
  const PI = Math.PI;
  function star(ctx, x, y, r, color) {
    ctx.fillStyle = color; ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -PI / 2 + i * PI / 5, q = i % 2 ? r * .43 : r;
      const px = x + Math.cos(a) * q, py = y + Math.sin(a) * q;
      if (!i) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fill();
  }
  function ellipse(ctx, x, y, rx, ry, color, rotation = 0) {
    ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rotation, 0, PI * 2); ctx.fill();
  }
  function line(ctx, x1, y1, x2, y2, color, width = 2) {
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }
  function drawBackdrop(ctx, id, W, H) {
    if (!get(id) || W <= 0 || H <= 0) return;
    ctx.save();
    const palettes = {summer:['#8ecbd8','#dceee4','#eecda4'], autumn:['#e9c993','#f7e6bd','#d6a56e'], winter:['#d9ecf3','#f4fbfc','#d6e8ee'], holiday:['#445777','#7887a4','#ded1cf']};
    const p = palettes[id];
    ctx.fillStyle = p[0]; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = p[1]; ctx.fillRect(0, H*.34, W, H*.32);
    ctx.fillStyle = p[2]; ctx.fillRect(0, H*.66, W, H*.34);
    // Motifs are duplicated beyond either edge of each tile, so the pattern wraps.
    for (let tile = -960; tile < W + 960; tile += 960) {
      if (id === 'summer') {
        for (const [x,y,r,c] of [[105,.17,26,'#f5d1a2'],[435,.12,20,'#f5b6b2'],[775,.23,28,'#f6df9a']]) {
          const cx=tile+x, cy=H*y; for(let k=0;k<8;k++){const a=k*PI/4; line(ctx,cx+Math.cos(a)*r*.35,cy+Math.sin(a)*r*.35,cx+Math.cos(a)*r,cy+Math.sin(a)*r,c,2);} star(ctx,cx,cy,4,c);
        }
        for(let j=0;j<3;j++){ctx.strokeStyle=['#b4e1e2','#e1f4ed','#9fd3d8'][j];ctx.lineWidth=3;ctx.beginPath();for(let x=0;x<=960;x+=8){const y=H*(.43+j*.065)+Math.sin(x*PI/120+j)*4;if(x===0)ctx.moveTo(tile+x,y);else ctx.lineTo(tile+x,y);}ctx.stroke();}
        ellipse(ctx,tile+220,H*.83,24,5,'#dbb68d'); ellipse(ctx,tile+682,H*.9,18,4,'#dbb68d');
      } else if (id === 'autumn') {
        for (const [x,y,r,c] of [[35,.16,10,'#b76543'],[220,.28,8,'#d98545'],[490,.13,11,'#c46645'],[710,.27,9,'#df9a4f'],[936,.18,11,'#b76543']]) {ellipse(ctx,tile+x,H*y,r,r*.55,c,-.6);line(ctx,tile+x-r*.7,H*y+r*.4,tile+x+r*.7,H*y-r*.4,'#f5d09c',1);}
        for (const x of [105,390,750]) { ellipse(ctx,tile+x,H*.78,18,6,'#b66b4a',-.28); ellipse(ctx,tile+x+38,H*.88,12,4,'#d88f50',.3); }
      } else if (id === 'winter') {
        for (const [x,y,r] of [[32,.12,3],[169,.25,4],[347,.08,3],[571,.2,4],[804,.1,3],[937,.29,3]]) ellipse(ctx,tile+x,H*y,r,r,'#fff');
        for (const x of [120,430,740]) {ellipse(ctx,tile+x,H*.8,7,3,'#b9d4df',-.3);ellipse(ctx,tile+x+17,H*.84,7,3,'#b9d4df',-.3);}
        ctx.fillStyle='#c5dfea'; ctx.beginPath();ctx.moveTo(tile,H*.65);for(let x=0;x<=960;x+=8)ctx.lineTo(tile+x,H*.65+Math.sin(x*PI/240)*9);ctx.lineTo(tile+960,H*.7);ctx.lineTo(tile,H*.7);ctx.closePath();ctx.fill();
      } else {
        for(const [x,y,r] of [[26,.1,5],[144,.25,4],[308,.12,7],[508,.27,4],[684,.13,5],[870,.23,6],[950,.08,5]]) star(ctx,tile+x,H*y,r,'#f7e2a6');
        for(const x of [150,480,810]) {ctx.fillStyle='#b8a3b8';ctx.fillRect(tile+x,H*.82,20,16);line(ctx,tile+x+10,H*.82,tile+x+10,H*.82+16,'#f5d9bf',2);line(ctx,tile+x,H*.82+7,tile+x+20,H*.82+7,'#f5d9bf',2);}
      }
    }
    ctx.restore();
  }
  function drawObject(ctx, id, object, done, time) {
    if (!get(id) || !object || !Number.isFinite(object.x) || !Number.isFinite(object.y)) return;
    ctx.save(); ctx.translate(object.x, object.y); ctx.globalAlpha *= done ? .5 : 1;
    const bob = done ? 0 : Math.sin((Number(time)||0)/650 + object.x/300)*2;
    ctx.translate(0,bob); ellipse(ctx,0,18,16,4,'rgba(47,41,38,.16)');
    if (id === 'summer') {
      ctx.fillStyle='#9f5d50';ctx.fillRect(-16,5,32,11);ctx.fillStyle='#e7bc7e';ctx.fillRect(-13,7,26,4);ctx.fillStyle='#d67b69';ctx.fillRect(-10,-10,7,16);ctx.fillRect(3,-13,7,19);line(ctx,-6,-10,-6,-14,'#fff1a9',2);line(ctx,6,-13,6,-17,'#fff1a9',2);star(ctx,6,-19,6,'#fff3b6');
    } else if (id === 'autumn') {
      ctx.save();ctx.rotate(-.15);ctx.fillStyle='#edd1a0';ctx.fillRect(-17,-12,34,24);line(ctx,-17,-12,0,2,'#bc8a62',2);line(ctx,17,-12,0,2,'#bc8a62',2);ellipse(ctx,1,-4,10,4,'#7d94a2');ctx.fillStyle='#7d94a2';ctx.beginPath();ctx.moveTo(-8,-4);ctx.lineTo(-15,-9);ctx.lineTo(-15,1);ctx.closePath();ctx.fill();ctx.restore();
    } else if (id === 'winter') {
      ctx.fillStyle='#e97886';ctx.beginPath();ctx.moveTo(-11,13);ctx.lineTo(-13,-5);ctx.quadraticCurveTo(-13,-16,-5,-16);ctx.quadraticCurveTo(2,-16,2,-7);ctx.lineTo(2,-4);ctx.quadraticCurveTo(11,-10,13,-3);ctx.quadraticCurveTo(14,2,7,6);ctx.lineTo(6,13);ctx.closePath();ctx.fill();ctx.fillStyle='#fff1e4';ctx.fillRect(-12,8,19,6);
    } else {
      ctx.fillStyle='#d86e82';ctx.fillRect(-16,-12,32,26);ctx.fillStyle='#f7d984';ctx.fillRect(-3,-12,6,26);ctx.fillRect(-16,-4,32,5);ellipse(ctx,-6,-15,7,4,'#f7d984',.5);ellipse(ctx,6,-15,7,4,'#f7d984',-.5);star(ctx,0,-1,4,'#fff4bd');
    }
    if (done) {ctx.font='bold 12px sans-serif';ctx.textAlign='center';ctx.fillStyle='#473b39';ctx.fillText(id === 'autumn' ? 'あつめた' : 'できた',0,-30);}
    ctx.restore();
  }
  function drawEnemy(ctx, id, enemy, time) {
    if (!get(id) || !enemy || !Number.isFinite(enemy.x) || !Number.isFinite(enemy.y)) return;
    ctx.save();ctx.translate(enemy.x,enemy.y);ctx.translate(0,Math.sin((Number(time)||0)/550 + enemy.x/250)*1.5);
    ellipse(ctx,0,16,18,4,'rgba(47,41,38,.17)');
    if(id==='summer') {
      ellipse(ctx,0,4,18,11,'#f47f70');ellipse(ctx,0,4,13,8,'#ffe3a9');ellipse(ctx,0,4,8,5,'#f47f70');
      line(ctx,-14,6,-21,0,'#e66f65',4);line(ctx,14,6,21,0,'#e66f65',4);ellipse(ctx,-22,-2,5,4,'#f47f70');ellipse(ctx,22,-2,5,4,'#f47f70');
      ellipse(ctx,0,-5,10,8,'#f47f70');
    } else if(id==='autumn') {
      ctx.fillStyle='#a65f3d';ctx.beginPath();ctx.moveTo(0,-19);ctx.quadraticCurveTo(20,-13,17,4);ctx.quadraticCurveTo(16,17,0,17);ctx.quadraticCurveTo(-16,17,-17,4);ctx.quadraticCurveTo(-20,-13,0,-19);ctx.fill();ellipse(ctx,0,7,12,8,'#e9b383');line(ctx,-4,-16,0,-22,'#658b59',2);
    } else if(id==='winter') {
      ellipse(ctx,-7,-13,5,13,'#eaf7fa',-.2);ellipse(ctx,7,-13,5,13,'#eaf7fa',.2);ellipse(ctx,-7,-14,2,8,'#edc7d2',-.2);ellipse(ctx,7,-14,2,8,'#edc7d2',.2);ellipse(ctx,0,4,16,13,'#f7ffff');ellipse(ctx,0,13,10,4,'#b6dce8');
    } else {
      star(ctx,0,0,18,'#f6d780');ellipse(ctx,-12,-12,7,5,'#d88ab4',.5);ellipse(ctx,12,-12,7,5,'#d88ab4',-.5);ellipse(ctx,0,-12,4,4,'#d88ab4');
    }
    ellipse(ctx,-5,1,2,2.5,'#493f48');ellipse(ctx,5,1,2,2.5,'#493f48');
    ctx.strokeStyle='#784d53';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(0,4,3,0,PI);ctx.stroke();
    ctx.restore();
  }
  global.SakuraSeasonal = {EVENTS, get, drawBackdrop, drawObject, drawEnemy};
})(typeof window !== 'undefined' ? window : globalThis);
