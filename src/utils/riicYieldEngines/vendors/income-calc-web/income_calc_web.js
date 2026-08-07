/**
 * income_calc_web.js
 * 明日方舟基建效率计算器 —— 浏览器端纯前端移植版
 *
 * Python 原版: /data/arknights-base/income_calc_final.py（本文件逐行忠实移植）
 * 算法/正则/分支顺序/数值计算与 Python 版完全一致，未简化、未漏分支。
 *
 * 移植映射（每个函数均标注对应的 Python 函数名）：
 *   BUILD        <-  income_calc_final.py 中 BUILD = json['skills']
 *   getSkills()  <-  get_skills()
 *   parsePct()   <-  parse_pct()
 *   step()       <-  step()
 *   planIncome() <-  plan_income()
 *   calcSchedule() <- 主流程（查找排班 + 汇总 + 偏差）
 *   runMain()    <-  主流程的"直接运行"部分（搜索 schedule_export/*.json）
 *
 * 使用方式：
 *   1) 浏览器: <script src="income_calc_web.js"></script>
 *        -> window.IncomeCalcWeb，需先 await IncomeCalcWeb.loadData() 或 setData(skills)
 *   2) Node.js: const C = require('./income_calc_web.js');
 *        -> require 时自动从 data/ark_building_full.json 加载数据
 *   3) ES module: import C from './income_calc_web.js'（Node CJS 互操作，default 导出）
 *   4) 直接运行: node income_calc_web.js（复现 Python 主流程的完整控制台输出）
 */
(function (root, factory) {
  if (typeof module === 'object' && typeof module.exports === 'object') {
    module.exports = factory();
  } else {
    root.IncomeCalcWeb = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ==================== 常量（Python: MFG_BASE / SUI） ==================== */
  var MFG_BASE = { 'Battle Record': 8000.0 / 24.0, 'Pure Gold': 10000.0 / 24.0 };
  var SUI = new Set(['令', '夕', '重岳', '黍', '余']);
  var REF = { lmd: 54400, gold: 46300, exp: 36000 };   // 主流程参考值
  var UID = 1754125775145974;                          // 主流程排班 uid

  /* 干员技能数据（Python: BUILD，从 data/ark_building_full.json 的 skills 注入） */
  var BUILD = [];

  /* 整数格式化：等价 Python f"{x:.0f}"（本算法所有效率值均为整数，无舍入差异） */
  function fmt0(x) { return Math.round(x).toFixed(0); }

  /* 带符号百分比：等价 Python f"{x:+.1f}" */
  function signed1(x) { return (x >= 0 ? '+' : '') + x.toFixed(1); }

  /* === get_skills(op, room) ===
   * Python: return [s for s in BUILD if s['干员']==op and s.get('房间')==room] */
  function getSkills(op, room) {
    return BUILD.filter(function (s) {
      return s['干员'] === op && (s['房间'] || undefined) === room;
    });
  }

  /* === parse_pct(desc) ===
   * Python: 从技能描述正则提取效率百分比（生产力/订单获取效率/订单效率+N%），
   * 概率技能（裁缝/手工艺品）返回 0 */
  function parsePct(desc) {
    var m = desc.match(/(?:生产力|订单获取效率|订单效率)\+(\d+)%/);
    if (m) return parseInt(m[1], 10);
    m = desc.match(/\+(\d+)%(?:生产力|订单获取效率|订单效率)/);
    if (m) return parseInt(m[1], 10);
    if (desc.indexOf('裁缝') >= 0 || desc.indexOf('手工艺品') >= 0) return 0; // 概率技能，非效率
    return 0;
  }

  /* === step(operators, product, room, trade=2, power=3, fireworks=0, dorm=0) ===
   * Python: 计算单房间效率，返回 {eff, steps}，steps 为中文步骤字符串数组
   * （格式与 Python 版一致，如 "100+3×1=103"、"  苍苔.金属工艺+30=133"） */
  function step(operators, product, room, trade, power, fireworks, dorm) {
    trade = trade === undefined ? 2 : trade;
    power = power === undefined ? 3 : power;
    fireworks = fireworks === undefined ? 0 : fireworks;
    dorm = dorm === undefined ? 0 : dorm;

    var steps = [];
    var eff = 100.0 + operators.length * 1.0;
    steps.push('100+' + operators.length + '×1=' + fmt0(eff));

    /* ---- 贸易站：低语（归零+每人）特殊分支，提前 return ---- */
    if (room === '贸易站') {
      for (var oi = 0; oi < operators.length; oi++) {
        var op = operators[oi];
        var opSkills = getSkills(op, room);
        for (var si = 0; si < opSkills.length; si++) {
          var d = opSkills[si]['描述'] || '';
          if (d.indexOf('归零') >= 0 && d.indexOf('每人') >= 0) {
            eff = 100.0 + 1.0 + (operators.length - 1) * 45;
            steps.push('低语:100+1+' + (operators.length - 1) + '×45=' + fmt0(eff));
            var s2s = getSkills(op, room);
            for (var s2i = 0; s2i < s2s.length; s2i++) {
              var s2 = s2s[s2i];
              var bp = parsePct(s2['描述'] || '');
              if (bp > 0 && (s2['技能名'] || '').indexOf('低语') < 0) {
                eff += bp;
                steps.push('  +' + bp + '=' + fmt0(eff));
              }
            }
            return { eff: eff, steps: steps };
          }
        }
      }
    }

    /* ---- 自动化（全部归零 + 每个发电站+N%）: auto[op] 取该干员全部技能的最大值 ---- */
    var auto = {};
    for (var oi2 = 0; oi2 < operators.length; oi2++) {
      var op2 = operators[oi2];
      var sks2 = getSkills(op2, room);
      for (var si2 = 0; si2 < sks2.length; si2++) {
        var d2 = sks2[si2]['描述'] || '';
        if (d2.indexOf('全部归零') >= 0) {
          var m = d2.match(/每个发电站.*?\+(\d+)%/);
          if (m) auto[op2] = Math.max(auto[op2] || 0, power * parseInt(m[1], 10));
        }
      }
    }

    /* ---- 主循环：按干员·技能族（·α/·β 取同族最后一个）逐一加成 ---- */
    var handled = {};  // 防重复（Python: handled = set()）
    for (var oi3 = 0; oi3 < operators.length; oi3++) {
      var op3 = operators[oi3];
      var skills = getSkills(op3, room);
      if (!skills.length) continue;
      /* 按基础名分组（Python: n.rsplit('·',1)[0]） */
      var fam = {};
      for (var si3 = 0; si3 < skills.length; si3++) {
        var n = skills[si3]['技能名'] || '';
        var b;
        var dot = n.lastIndexOf('·');
        if (dot >= 0) b = n.slice(0, dot); else b = n;
        if (!fam[b]) fam[b] = [];
        fam[b].push(skills[si3]);
      }
      var bases = Object.keys(fam);
      for (var bi = 0; bi < bases.length; bi++) {
        var base = bases[bi];
        var key = op3 + ':' + base;
        if (handled[key]) continue;
        handled[key] = true;

        var fsk = fam[base];
        var best = fsk[fsk.length - 1];   // Python: best = fsk[-1]
        var dd = best['描述'] || '';
        if (dd.indexOf('归零') >= 0) continue;
        /* 跳过转化机制（超感→思维链环, 乐感→无声共鸣） */
        if (dd.indexOf('转化为') >= 0) continue;

        var add = 0, rsn = '';
        var bp2 = parsePct(dd);
        if (bp2 && !(dd.indexOf('全部归零') >= 0 || dd.indexOf('归零') >= 0 || dd.indexOf('每格仓库容量') >= 0)) {
          add = bp2; rsn = String(bp2);
        }

        if (dd.indexOf('每个贸易站') >= 0) {
          var m2 = dd.match(/每个贸易站.*?\+(\d+)%/);
          if (m2) { add = trade * parseInt(m2[1], 10); rsn = '2贸×' + parseInt(m2[1], 10); }
        }
        if (dd.indexOf('工程机器人') >= 0) {
          var m3 = dd.match(/每(\d+)个.*?\+(\d+)%/);
          if (m3) { add = Math.floor(64 / parseInt(m3[1], 10)) * parseInt(m3[2], 10); rsn = '机' + add; }
        }
        /* 配合意识：延后处理，需要等其他人效率算完 */
        if (base.indexOf('配合意识') >= 0 ||
            (dd.indexOf('其他干员提供的每') >= 0 && dd.indexOf('额外提供') >= 0)) {
          continue;
        }
        if (dd.indexOf('每个金属工艺类技能') >= 0) {
          /* 苍苔打工心得: 同站每有金属工艺干员+5% */
          var metalCount = 0;
          for (var oi4 = 0; oi4 < operators.length; oi4++) {
            var sks4 = getSkills(operators[oi4], room);
            for (var si4 = 0; si4 < sks4.length; si4++) {
              if ((sks4[si4]['技能名'] || '').indexOf('金属工艺') >= 0) { metalCount++; break; }
            }
          }
          add = metalCount * 5; rsn = '打工' + metalCount + '人×5';
        }
        if (dd.indexOf('思维链环') >= 0) {
          var m4 = dd.match(/每(\d+)点/);
          if (m4) { add = Math.floor(dorm / parseInt(m4[1], 10)); rsn = '链' + dorm + '÷' + parseInt(m4[1], 10); }
        }
        if (dd.indexOf('无声共鸣') >= 0) {
          var m5 = dd.match(/每(\d+)点/);
          if (m5) { add = Math.floor(dorm / parseInt(m5[1], 10)); rsn = '声' + dorm + '÷' + parseInt(m5[1], 10); }
        }
        if (dd.indexOf('首小时+15') >= 0) { add = 25; rsn = '延时'; }
        else if (dd.indexOf('最终达到+20') >= 0) { add = 20; rsn = '渐进'; }
        else if (dd.indexOf('最终达到+10') >= 0) { add = 10; rsn = '渐进'; }
        if (dd.indexOf('人间烟火') >= 0 && dd.indexOf('效率') >= 0 &&
            (dd.indexOf('每有1点') >= 0 || dd.indexOf('每1点') >= 0)) {
          add = fireworks; rsn = '烟火' + fireworks;
        }
        if (dd.indexOf('每格仓库容量') >= 0) {
          /* 统计同站所有仓库容量技能 */
          var capacity = 0;
          for (var oi5 = 0; oi5 < operators.length; oi5++) {
            var sks5 = getSkills(operators[oi5], room);
            for (var si5 = 0; si5 < sks5.length; si5++) {
              var sd = sks5[si5]['描述'] || '';
              if (sd.indexOf('仓库容量上限') >= 0 || sd.indexOf('仓库容量+') >= 0) {
                var vals = sks5[si5]['数值'] || [];
                if (vals.length && vals[0] > 0) capacity += vals[0];
              }
            }
          }
          add = Math.floor(capacity) * 2; rsn = '容量' + add;
        }

        if (add) {
          eff += add;
          steps.push('  ' + op3 + '.' + base + '+' + rsn + '=' + fmt0(eff));
        }
      }
    }

    /* ---- 配合意识延后计算（需要等所有人技能加完） ---- */
    for (var oi6 = 0; oi6 < operators.length; oi6++) {
      var op6 = operators[oi6];
      var hasCoop = false;
      var sks6 = getSkills(op6, room);
      for (var si6 = 0; si6 < sks6.length; si6++) {
        if ((sks6[si6]['技能名'] || '').indexOf('配合意识') >= 0 ||
            ((sks6[si6]['描述'] || '').indexOf('其他干员提供的每') >= 0 &&
             (sks6[si6]['描述'] || '').indexOf('额外提供') >= 0)) {
          hasCoop = true; break;
        }
      }
      if (hasCoop) {
        var otherEff = eff - 100 - operators.length;
        var add2 = Math.min(Math.floor(otherEff / 5) * 5, 40);
        if (add2) {
          eff += add2;
          steps.push('  ' + op6 + '.配合意识+' + add2 + '=' + fmt0(eff));
        }
      }
    }

    /* ---- 自动化干员最后统一追加（Python: for op, v in auto.items()） ---- */
    var autoKeys = Object.keys(auto);
    for (var ai = 0; ai < autoKeys.length; ai++) {
      var opA = autoKeys[ai];
      var v = auto[opA];
      eff += v;
      steps.push('  ' + opA + '自动化' + v + '=' + fmt0(eff));
    }

    return { eff: eff, steps: steps };
  }

  /* === plan_income(plan) ===
   * Python: 解析排班计划 rooms 结构，遍历制造站/贸易站/控制中枢/宿舍，计算全天收益
   * 返回 {lmd, exp, gold, steps}（steps 为中文输出行，与 Python print 一致） */
  function planIncome(plan, verbose) {
    var rooms = plan['rooms'];
    var logs = [];
    function plog(s) { logs.push(s); if (verbose) console.log(s); }

    /* do = 宿舍干员总数（Python: sum(len(s.get('operators',[])) ...)，含空字符串占位） */
    var dormSlots = Array.isArray(rooms['dormitory']) ? rooms['dormitory'] : [];
    var do_ = 0;
    for (var di = 0; di < dormSlots.length; di++) {
      var sd = dormSlots[di];
      if (sd && typeof sd === 'object' && !Array.isArray(sd)) {
        do_ += (sd['operators'] || []).length;
      }
    }

    var fw = do_, asc = 0;
    var lingFireworks = 0, chongyueFireworks = 0;
    var allOps = {};
    ['manufacture', 'trading', 'power', 'control'].forEach(function (rk) {
      var sls = Array.isArray(rooms[rk]) ? rooms[rk] : [];
      for (var i = 0; i < sls.length; i++) {
        var sl = sls[i];
        if (sl && typeof sl === 'object' && !Array.isArray(sl)) {
          var ops = sl['operators'] || [];
          for (var j = 0; j < ops.length; j++) { if (ops[j]) allOps[ops[j]] = true; }
        }
      }
    });
    var suiC = 0;
    Object.keys(allOps).forEach(function (o) { if (SUI.has(o)) suiC++; });

    /* 控制中枢：令/重岳 人间烟火、所有贸易站 +7%（阿斯卡纶 情报主脑） */
    var ctrlSlots = Array.isArray(rooms['control']) ? rooms['control'] : [];
    for (var ci = 0; ci < ctrlSlots.length; ci++) {
      var csl = ctrlSlots[ci];
      if (csl && typeof csl === 'object' && !Array.isArray(csl)) {
        var cops = csl['operators'] || [];
        for (var cj = 0; cj < cops.length; cj++) {
          var cop = cops[cj];
          if (!cop) continue;
          var cskills = getSkills(cop, '控制中枢');
          for (var ck = 0; ck < cskills.length; ck++) {
            var cd = cskills[ck]['描述'] || '';
            var cn = cskills[ck]['技能名'] || '';
            if (cop === '令' && cd.indexOf('人间烟火') >= 0) {
              lingFireworks = 15;
              fw += lingFireworks;
            }
            if (cop === '重岳' && cd.indexOf('人间烟火') >= 0 && cn.indexOf('知我') >= 0) {
              chongyueFireworks = Math.min(suiC * 5, 25);
              fw += chongyueFireworks;
            }
            if (cd.indexOf('所有贸易站') >= 0) asc = 7;
          }
        }
      }
    }

    plog('  烟火=' + fw + '(dorm' + do_ + '+令' + lingFireworks + '重岳' + chongyueFireworks + ') asc=+' + asc);

    var lmd = 0.0, exp = 0.0, gold = 0.0;

    /* ---- 制造站 ---- */
    var mfgSlots = Array.isArray(rooms['manufacture']) ? rooms['manufacture'] : [];
    for (var mi = 0; mi < mfgSlots.length; mi++) {
      var slot = mfgSlots[mi];
      if (!(slot && typeof slot === 'object' && !Array.isArray(slot)) || slot['skip']) continue;
      var ops2 = (slot['operators'] || []).filter(function (o) { return o; });
      var prod = slot['product'] || '';
      if (!Object.prototype.hasOwnProperty.call(MFG_BASE, prod) || !ops2.length) continue;
      var r = step(ops2, prod, '制造站', 2, 3, fw, do_);
      var eff = r.eff, st = r.steps;
      var day = MFG_BASE[prod] * eff / 100 * 24;
      var label = prod === 'Battle Record' ? '经验' : '赤金';
      plog('  制造' + (mi + 1) + '[' + label + '] ' + ops2.join(','));
      for (var x = 0; x < st.length; x++) plog('    ' + st[x]);
      plog('    → ' + fmt0(MFG_BASE[prod]) + '/h × ' + fmt0(eff) + '% = ' + fmt0(day) + '/天');
      if (prod === 'Battle Record') exp += day; else gold += day;
    }

    /* ---- 贸易站 ---- */
    var trdSlots = Array.isArray(rooms['trading']) ? rooms['trading'] : [];
    for (var ti = 0; ti < trdSlots.length; ti++) {
      var tslot = trdSlots[ti];
      if (!(tslot && typeof tslot === 'object' && !Array.isArray(tslot)) || tslot['skip']) continue;
      var tops = (tslot['operators'] || []).filter(function (o) { return o; });
      if (!tops.length) continue;
      var r2 = step(tops, 'LMD', '贸易站', 2, 3, fw, do_);
      var eff2 = r2.eff, st2 = r2.steps;
      if (asc) { eff2 += asc; st2.push('  asc+' + asc + '=' + fmt0(eff2)); }
      /* 但书/龙舌兰 订单结构基数（非效率加成） */
      var hasD = tops.some(function (o) { return o.indexOf('但书') >= 0; });
      var hasL = tops.some(function (o) { return o.indexOf('龙舌兰') >= 0; });
      var b, tag;
      if (hasD && hasL) { b = 16637; tag = '但+龙(16637)'; }
      else if (hasD) { b = 15929; tag = '但书(15929)'; }
      else if (hasL) { b = 10973; tag = '龙舌兰(10973)'; }
      else { b = 10265; tag = '无(10265)'; }
      var day2 = b * eff2 / 100;
      plog('  贸易' + (ti + 1) + '[' + tag + '] ' + tops.join(','));
      for (var y = 0; y < st2.length; y++) plog('    ' + st2[y]);
      plog('    → ' + tag + '×' + fmt0(eff2) + '% = ' + fmt0(day2) + '/天');
      lmd += day2;
    }

    return { lmd: lmd, exp: exp, gold: gold, steps: logs };
  }

  /* === calcSchedule(scheduleJson) ===
   * 主流程封装：输入排班 schedule JSON（含 plans/rooms），返回汇总结果与偏差 */
  function calcSchedule(sched, verbose) {
    var logs = [];
    function slog(s) { logs.push(s); if (verbose) console.log(s); }

    slog('排班 ' + UID + ' | 243 | ' + (sched['planTimes'] || '?') + '班制');
    slog('==================================================');

    var tl = 0.0, te = 0.0, tg = 0.0;
    var plans = sched['plans'] || [];
    var n = plans.length;
    var perPlan = [];
    if (n === 0) slog('排班数据中 plans 为空，无法计算收益');
    for (var pi = 0; pi < n; pi++) {
      var plan = plans[pi];
      slog('');
      slog('===== 第' + (pi + 1) + '班 ' + (plan['name'] || '') + ' =====');
      var r = planIncome(plan, false);   // planIncome 内部不打日志，统一由 slog 输出（避免重复打印）
      tl += r.lmd; te += r.exp; tg += r.gold;
      for (var i = 0; i < r.steps.length; i++) slog(r.steps[i]);
      slog('  班次合计: LMD=' + fmt0(r.lmd) + ' EXP=' + fmt0(r.exp) + ' GOLD=' + fmt0(r.gold));
      perPlan.push({ name: plan['name'] || '', lmd: r.lmd, exp: r.exp, gold: r.gold, stepCount: r.steps.length });
    }

    slog('');
    slog('==================================================');
    var al = n ? tl / n : 0, ae = n ? te / n : 0, ag = n ? tg / n : 0;
    slog('  PRTS解析: LMD=' + fmt0(al) + '  EXP=' + fmt0(ae) + '  GOLD=' + fmt0(ag));
    slog('  参考值:   LMD=' + REF.lmd + '  EXP=' + REF.exp + '  GOLD=' + REF.gold);
    var dL = al / REF.lmd * 100 - 100, dE = ae / REF.exp * 100 - 100, dG = ag / REF.gold * 100 - 100;
    slog('  偏差:     LMD=' + signed1(dL) + '%  EXP=' + signed1(dE) + '%  GOLD=' + signed1(dG) + '%');

    return {
      lmd: al, exp: ae, gold: ag,
      total: { lmd: tl, exp: te, gold: tg },
      deviation: { lmd: dL, exp: dE, gold: dG },
      perPlan: perPlan,
      steps: logs
    };
  }

  /* ==================== 数据加载 ==================== */
  /* setData(skills)：注入干员技能数据（ark_building_full.json 的 skills 数组） */
  function setData(skills) { BUILD = skills || []; }
  function getData() { return BUILD; }

  /* loadNodeData()：Node 环境从 data/ark_building_full.json 同步读取（等价 Python 模块级加载） */
  function loadNodeData() {
    if (typeof module === 'object' && typeof require === 'function') {
      try {
        var fs = require('fs'), path = require('path');
        var fp = path.join(__dirname, 'data', 'ark_building_full.json');
        BUILD = JSON.parse(fs.readFileSync(fp, 'utf-8'))['skills'];
        return true;
      } catch (e) { return false; }
    }
    return false;
  }

  /* loadData(url)：浏览器端 fetch 加载（默认相对路径 data/ark_building_full.json），返回 Promise */
  function loadData(url) {
    url = url || 'data/ark_building_full.json';
    return fetch(url).then(function (r) { return r.json(); }).then(function (d) {
      setData(d['skills']); return d['skills'];
    });
  }

  /* === runMain() ===
   * 主流程：搜索 schedule_export/*.json 找 uid=1754125775145974，计算并输出（等价 Python 主流程） */
  function runMain() {
    var fs = require('fs'), path = require('path');
    var dir = path.join(__dirname, 'schedule_export');
    var sched = null, src = '';
    var files = fs.readdirSync(dir).filter(function (f) { return f.slice(-5) === '.json'; }).sort();
    for (var i = 0; i < files.length; i++) {
      var arr = JSON.parse(fs.readFileSync(path.join(dir, files[i]), 'utf-8'));
      for (var j = 0; j < arr.length; j++) {
        if (arr[j]['scheduleId'] === UID || arr[j]['uid'] === UID) {
          sched = JSON.parse(arr[j]['schedule']); src = files[i]; break;
        }
      }
      if (sched) break;
    }
    if (!sched) {
      console.log('未找到排班 ' + UID + '：请确认 schedule_export/ 目录存在，且包含 scheduleId/uid=' + UID + ' 的排班 JSON 文件');
      process.exit(1);
    }
    console.log('（数据源: ' + src + '）');
    return calcSchedule(sched, true);
  }

  /* Node 环境：require 时自动加载数据；直接运行时执行主流程（等价 python income_calc_final.py） */
  if (typeof module === 'object' && typeof require === 'function') {
    loadNodeData();
    if (require.main === module) runMain();
  }

  return {
    MFG_BASE: MFG_BASE,
    SUI: SUI,
    REF: REF,
    UID: UID,
    setData: setData,
    getData: getData,
    getSkills: getSkills,
    parsePct: parsePct,
    step: step,
    planIncome: planIncome,
    calcSchedule: calcSchedule,
    loadData: loadData,
    loadNodeData: loadNodeData,
    runMain: runMain,
    fmt0: fmt0
  };
});
