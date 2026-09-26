//#region src/utils/operatorProgression.ts
var e = /* @__PURE__ */ new Set(["processing", "training"]);
function t(e) {
	return typeof e == "object" && !!e && !Array.isArray(e);
}
function n(e) {
	return e === 2 ? 2 : +(e === 1);
}
function r(e) {
	return Math.max(0, Math.min(90, Math.round(e)));
}
function i(e, t) {
	return `${e}-${t}`;
}
function a(e, t) {
	return e === "elite" ? `精英${t}` : `${t}级`;
}
function o(e, t) {
	let n = t.unlock.type === "level" ? "level" : "elite", r = Number(t.unlock.value);
	if (Number.isInteger(r)) return {
		key: i(n, r),
		type: n,
		value: r,
		label: a(n, r),
		facilities: [e.room]
	};
}
function s(e) {
	return (e?.chains ?? []).filter((e) => e.room === "dormitory").flatMap((e) => {
		let t = e.stages.find((e) => e.effects.some((e) => e.stat !== "moodRecover")), n = t ? o(e, t) : void 0;
		return n ? [n] : [];
	});
}
function c(e, r = "") {
	if (!t(e)) return;
	let i = typeof e.id == "string" ? e.id : r, a = typeof e.name == "string" ? e.name : "", o = Number(e.elite), s = Number(e.level), c = Number(e.rarity);
	if (!(!i || !a || !Number.isInteger(o) || o < 0 || o > 2 || !Number.isInteger(s) || s < 0 || s > 90 || typeof e.own != "boolean" || !Number.isInteger(c) || c < 1 || c > 6)) return {
		id: i,
		name: a,
		elite: n(o),
		level: s,
		owned: e.own,
		rarity: c
	};
}
function l(e) {
	if (!Array.isArray(e) || e.length === 0) throw Error("练度 JSON 必须是非空数组");
	let t = e.map((e) => c(e));
	if (t.some((e) => !e)) throw Error("练度 JSON 包含无效干员记录");
	let n = t;
	if (new Set(n.map((e) => e.id)).size !== n.length) throw Error("练度 JSON 包含重复干员 ID");
	return n;
}
function u(e) {
	return Object.fromEntries(Object.entries(e).map(([e, t]) => [e, { ...t }]));
}
function d(e) {
	if (!e) return [];
	let t = /* @__PURE__ */ new Map();
	return e.chains.forEach((e) => {
		e.stages.forEach((n) => {
			let r = n.unlock.type === "level" ? "level" : "elite", o = Number(n.unlock.value);
			if (!Number.isInteger(o)) return;
			let s = i(r, o), c = t.get(s) ?? {
				key: s,
				type: r,
				value: o,
				label: a(r, o),
				facilities: []
			};
			c.facilities.includes(e.room) || c.facilities.push(e.room), t.set(s, c);
		});
	}), [...t.values()].sort((e, t) => e.type === t.type ? e.value - t.value : e.type === "elite" ? -1 : 1);
}
function f(e, t) {
	return t.type === "elite" ? e.elite >= t.value : e.level >= t.value;
}
function p(e, t) {
	return t.every((t) => f(e, t));
}
function m(e, t) {
	return e.elite > t.elite || e.elite === t.elite && e.level > t.level;
}
function h(e) {
	if (e.length === 0) return {
		elite: 0,
		level: 0
	};
	let t = e.filter((e) => e.type === "elite"), r = e.filter((e) => e.type === "level");
	return {
		elite: n(Math.max(0, ...t.map((e) => e.value))),
		level: Math.max(1, ...r.map((e) => e.value))
	};
}
function g(t, n, r = 0, i = !1) {
	if (n === "meeting") {
		let e = d(t).filter((e) => e.facilities.includes(n));
		return {
			elite: r,
			level: Math.max(1, ...e.filter((e) => e.type === "level").map((e) => e.value))
		};
	}
	return n === "dormitory" ? h((i ? d(t) : s(t)).filter((e) => e.facilities.includes(n))) : e.has(n) ? {
		elite: 0,
		level: 0
	} : h(d(t).filter((e) => e.facilities.includes(n)));
}
function _(e) {
	let t = d(e).filter((e) => e.type === "elite");
	return n(Math.max(0, ...t.map((e) => e.value)));
}
function v(e) {
	let t = e.profile?.entries[e.operatorId], i = e.operatorId === "char_272_strong" && e.facility === "trading", a = i ? {
		elite: 0,
		level: 1
	} : g(e.operatorSkillFile, e.facility, e.maxEliteLevel, e.dormitoryDefaultIncludesMoodRecovery), o = e.manualElite === void 0 ? void 0 : n(e.manualElite), s = e.manualLevel === void 0 ? void 0 : r(e.manualLevel), c = o !== void 0 || s !== void 0, l = t?.elite ?? a.elite, u = t?.level ?? a.level, d = {
		elite: o ?? l,
		level: s ?? u,
		owned: t?.owned ?? !e.profile
	};
	if (e.treatSkillsAsUnlocked) {
		let n = i ? a : g(e.operatorSkillFile, e.facility, e.maxEliteLevel, e.dormitoryDefaultIncludesMoodRecovery);
		return {
			elite: o ?? Math.max(l, n.elite),
			level: s ?? Math.max(u, n.level),
			owned: d.owned,
			upgraded: t ? m({
				elite: o ?? n.elite,
				level: s ?? n.level
			}, t) : d.elite < n.elite || d.level < n.level
		};
	}
	return t && !t.owned && !c ? {
		...a,
		owned: !1,
		upgraded: !0
	} : {
		...d,
		upgraded: !c && !t
	};
}
function y(e) {
	return d(e);
}
function b(e) {
	if (e <= 2) return [{
		key: "level-1",
		type: "level",
		value: 1,
		label: "1级",
		facilities: []
	}, {
		key: "level-30",
		type: "level",
		value: 30,
		label: "30级",
		facilities: []
	}];
	let t = e === 3 ? 1 : 2;
	return Array.from({ length: t + 1 }, (e, t) => ({
		key: `elite-${t}`,
		type: "elite",
		value: t,
		label: `精英${t}`,
		facilities: []
	}));
}
function x(e, t, n) {
	let r = d(e).filter((e) => e.facilities.includes(t)).filter((e) => {
		if (e.type === "level") return e.value === 30;
		if (n <= 2) return e.value === 0;
		let t = n === 3 ? 1 : 2;
		return e.value <= t;
	});
	if (r.length === 0) return [];
	let i = b(n), a = i[0], o = /* @__PURE__ */ new Map();
	return a && o.set(a.key, { ...a }), r.forEach((e) => {
		let t = n <= 2 && e.type === "elite" ? i[0] : n <= 2 && e.type === "level" ? i[1] : e;
		t && o.set(t.key, {
			...t,
			facilities: [...e.facilities]
		});
	}), [...o.values()].sort((e, t) => e.type === t.type ? e.value - t.value : e.type === "elite" ? -1 : 1);
}
function S(e, t) {
	return f(e, t);
}
function C(e, t, n) {
	return p(e, d(t).filter((e) => e.facilities.includes(n)));
}
//#endregion
//#region src/types/schedule.ts
var w = [
	"control",
	"trading",
	"manufacture",
	"power",
	"meeting",
	"hire",
	"processing",
	"training",
	"dormitory"
];
//#endregion
//#region src/utils/efficiency/catalog.ts
function T(e) {
	return e ? e.split(/\r?\n/).slice(1).join("").split(/[、,，]/).map((e) => e.trim()).filter(Boolean) : [];
}
function E(e) {
	return Object.fromEntries(Object.entries(e).map(([e, t]) => [e, {
		...t,
		members: t.members?.length ? [...t.members] : T(t.definition)
	}]));
}
function ee(e) {
	return e ? e.chains.flatMap((e) => e.stages.map((e) => e.name)) : [];
}
function te(e, t) {
	let n = {};
	return e.forEach((e) => {
		n[e.name] = {
			id: e.id,
			name: e.name,
			maxEliteLevel: ne(e.rarity ?? 0),
			rarity: e.rarity ?? 0,
			skillFile: e,
			skillNames: ee(e)
		};
	}), {
		operators: n,
		terms: E(t)
	};
}
function ne(e) {
	return e >= 4 ? 2 : +(e === 3);
}
function re(e, t) {
	return e.operators[t];
}
function ie(e, t) {
	return t ? e.terms[t]?.members ?? [] : [];
}
function ae(e, t, n) {
	return ie(e, t).includes(n);
}
//#endregion
//#region src/utils/specialOperators.ts
var oe = /^\d+(?:\.\d+)?%$/;
function se(e) {
	if (oe.test(e.trim())) return Number(e.trim().slice(0, -1));
}
function ce(e) {
	return se(e) !== void 0;
}
function le(e, t) {
	return ue(e, t.terms);
}
function ue(e, t) {
	let n = e.trim();
	return Object.entries(t).filter(([e, t]) => e === n || t.name === n).map(([e]) => e);
}
function de(e, t) {
	return le(e, t).length > 0;
}
function D(e, t) {
	return ce(e) || de(e, t);
}
function fe(e, t = {}) {
	return ce(e) || ue(e, t).length > 0;
}
function pe(e, t) {
	let n = e.trim();
	if (ce(n)) return n;
	let r = ue(n, t)[0], i = r ? t[r]?.name : void 0;
	if (i) return Array.from(i).slice(0, 2).join("");
}
function me(e) {
	let t = /* @__PURE__ */ new Map();
	return function(n) {
		return t.has(n) || t.set(n, pe(n, e)), t.get(n);
	};
}
function O(e, t, n) {
	return ie(e, t).includes(n) || t !== void 0 && le(n, e).includes(t);
}
function he(e, t) {
	let n = le(e, t);
	return Array.from(new Set(n.flatMap((e) => ie(t, e))));
}
//#endregion
//#region src/utils/schedule.ts
var ge = class extends Error {
	constructor(e) {
		super(e.join("；")), this.name = "SchedulePeriodError";
	}
};
function k(e) {
	if (typeof e != "string" || !/^\d{2}:\d{2}$/.test(e)) return;
	let [t, n] = e.split(":"), r = Number(t), i = Number(n);
	return r <= 23 && i <= 59 ? r * 60 + i : void 0;
}
function _e(e, t) {
	let n = k(e), r = k(t);
	if (n !== void 0 && r !== void 0) return n <= r ? [[e, t]] : [[e, "23:59"], ["00:00", t]];
}
function ve(e) {
	let t = Math.max(0, Math.min(1439, e));
	return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}
function ye(e, t) {
	if (!Array.isArray(e) || e.length === 0 || e.length > 2) return {
		intervals: [],
		error: `队列 ${t + 1} 的 period 必须包含一个时间段，或包含规范的跨午夜两个时间段`
	};
	let n = [], r;
	for (let [i, a] of e.entries()) {
		if (!Array.isArray(a) || a.length !== 2) return {
			intervals: [],
			error: `队列 ${t + 1} 的 period[${i}] 必须是开始和结束时间`
		};
		let e = k(a[0]), o = k(a[1]);
		if (e === void 0 || o === void 0) return {
			intervals: [],
			error: `队列 ${t + 1} 的 period 时间必须是 HH:mm 格式且在 00:00 到 23:59 之间`
		};
		r ??= e;
		let s = (e, r) => n.push({
			end: r + 1,
			planIndex: t,
			start: e
		});
		e === o || e < o ? s(e, o) : (s(e, 1439), s(0, o));
	}
	if (e.length === 2) {
		let n = e[0], r = e[1], i = k(n?.[0]), a = k(n?.[1]), o = k(r?.[0]), s = k(r?.[1]);
		if (i === void 0 || a !== 1439 || o !== 0 || s === void 0 || i <= s) return {
			intervals: [],
			error: `队列 ${t + 1} 的多个 period 只能表示一个规范的跨午夜时间段`
		};
	}
	return {
		intervals: n,
		start: r
	};
}
function be(e) {
	if (!e.plans.some((e) => e.period !== void 0)) return {
		durations: e.plans.map(() => void 0),
		enabled: !1,
		errors: [],
		warnings: []
	};
	let t = [], n = [], r = e.plans.map(() => void 0), i = [], a = [];
	e.plans.forEach((n, r) => {
		if (n.period === void 0) {
			t.push(`队列 ${r + 1} 缺少 period 时间设置`);
			return;
		}
		let o = ye(n.period, r);
		if (o.error || o.start === void 0) {
			t.push(o.error ?? `队列 ${r + 1} 的 period 无效`);
			return;
		}
		e.plans.length === 1 && o.intervals.length === 1 && o.intervals[0]?.start === 0 && o.intervals[0]?.end === 1440 && t.push("单队列不能使用 00:00 到 23:59 表示全天"), a.push(o.start), i.push(...o.intervals);
	});
	let o = [...i].sort((e, t) => e.start - t.start || e.end - t.end), s = 0;
	o.forEach((e, r) => {
		if (e.start < s) {
			t.push(`队列 ${e.planIndex + 1} 的 period 与其他队列时间重叠`), s = Math.max(s, e.end);
			return;
		}
		r > 0 && e.start > s && n.push(`定时换班存在 ${ve(s)} 到 ${ve(e.start - 1)} 的时间空档`), s = e.end;
	});
	let c = o[0];
	return c && c.start > 0 && n.unshift(`定时换班存在 00:00 到 ${ve(c.start - 1)} 的时间空档`), s < 1440 && n.push(`定时换班存在 ${ve(s)} 到 23:59 的时间空档`), t.length === 0 && a.length === e.plans.length && r.forEach((t, n) => {
		let i = a[n], o = a[(n + 1) % a.length];
		i !== void 0 && o !== void 0 && (r[n] = a.length === 1 ? i === k(e.plans[0]?.period?.[0]?.[1]) ? 1 : 1440 : (o - i + 1440) % 1440);
	}), {
		durations: r,
		enabled: !0,
		errors: t,
		warnings: n
	};
}
var A = {
	control: "控制中枢",
	trading: "贸易站",
	manufacture: "制造站",
	power: "发电站",
	meeting: "会客室",
	hire: "办公室",
	processing: "加工站",
	training: "训练室",
	dormitory: "宿舍"
}, xe = [...w], Se = {
	control: [
		0,
		0,
		0,
		0,
		0
	],
	trading: [
		-10,
		-30,
		-60
	],
	manufacture: [
		-10,
		-30,
		-60
	],
	power: [
		60,
		130,
		270
	],
	meeting: [
		-10,
		-30,
		-60
	],
	hire: [
		-10,
		-30,
		-60
	],
	dormitory: [
		-10,
		-20,
		-30,
		-45,
		-65
	],
	processing: [
		-10,
		-10,
		-10
	],
	training: [
		-10,
		-30,
		-60
	]
}, Ce = {
	龙门币: "龙门币",
	合成玉: "合成玉",
	赤金: "赤金",
	中级作战记录: "作战记录",
	源石碎片: "源石碎片"
}, we = {
	LMD: "龙门币",
	Orundum: "合成玉",
	"Pure Gold": "赤金",
	"Battle Record": "中级作战记录",
	"Originium Shard": "源石碎片",
	作战记录: "中级作战记录",
	贵金属: "赤金"
};
function j(e) {
	let t = e.trim();
	return we[t] ?? t;
}
Object.entries(Ce).map(([e, t]) => ({
	value: e,
	label: t
})), new Set(w);
function Te(e) {
	return typeof e == "object" && !!e && !Array.isArray(e);
}
function Ee(e, t) {
	return e === "control" || e === "trading" || e === "manufacture" ? t : e === "power" || e === "hire" || e === "processing" ? 1 : e === "meeting" || e === "training" ? 2 : 5;
}
function De(e, t) {
	return Se[e][t - 1] ?? 0;
}
function Oe(e, t, n) {
	let r = e.rooms[t];
	if (!Array.isArray(r)) return {};
	let i = r[n];
	if (!Te(i)) return {};
	let a = i;
	if (typeof a.product != "string") return a;
	let o = j(a.product);
	return o === a.product ? a : {
		...a,
		product: o
	};
}
function ke(e) {
	if (!e) return;
	let t = Object.fromEntries(Object.entries(e).map(([e, t]) => {
		let n = { ...t };
		return delete n.mood, [e, n];
	}));
	return Object.keys(t).length > 0 ? t : void 0;
}
function Ae(e, t, n, r) {
	let i = e.plans[t], a = i ? Oe(i, n, r) : {};
	if (!a.skip || e.plans.length === 0) return {
		assignment: a,
		inherited: !1
	};
	for (let i = 1; i <= e.plans.length; i += 1) {
		let o = (t - i + e.plans.length) % e.plans.length, s = e.plans[o];
		if (!s) continue;
		let c = Oe(s, n, r);
		if (c.skip || !c.operators?.some(Boolean)) continue;
		let l = ke(c.operatorStates);
		return {
			inherited: !0,
			sourcePlanIndex: o,
			assignment: {
				...a,
				skip: !1,
				operators: c.operators ? [...c.operators] : void 0,
				...l ? { operatorStates: l } : { operatorStates: void 0 }
			}
		};
	}
	return {
		assignment: {
			...a,
			operators: void 0,
			operatorStates: void 0
		},
		inherited: !1
	};
}
//#endregion
//#region src/utils/efficiency/baseRules.ts
var je = [
	"control",
	"trading",
	"manufacture",
	"power",
	"meeting",
	"hire"
], Me = {
	trading: 100,
	manufacture: 100,
	power: 100,
	meeting: 107,
	hire: 100
}, Ne = {
	1: 107,
	2: 109,
	3: 111
}, Pe = {
	1: 24,
	2: 36,
	3: 54
}, Fe = {
	1: 6,
	2: 8,
	3: 10
}, M = {
	productAmount: 20,
	materialAmount: 2,
	hours: 2
}, N = {
	schemaVersion: 2,
	version: "arknights-riic-2026-09",
	defaultDurationMinutes: 720,
	powerOutputPerHour: 10,
	clueBaseTimeHours: 20,
	clueOutputPerHour: 1 / 20,
	clueLimit: 11,
	creditPerClue: 40,
	hireOutputPerHour: 1 / 12,
	hireLimit: 3,
	droneLimit: 235,
	baseEfficiency: Me,
	meetingEfficiencyByLevel: Ne,
	manufactureStorageByLevel: Pe,
	tradeOrderLimitByLevel: Fe,
	manufactureRules: {
		中级作战记录: {
			product: "中级作战记录",
			recipe: "作战记录",
			amount: 1,
			hours: 3,
			volume: 5
		},
		赤金: {
			product: "赤金",
			recipe: "贵金属",
			amount: 1,
			hours: 1.2,
			volume: 2
		},
		"源石碎片:固源岩": {
			product: "源石碎片",
			recipe: "源石碎片",
			amount: 1,
			hours: 1,
			volume: 3,
			materials: {
				固源岩: 2,
				龙门币: 1600
			}
		},
		"源石碎片:装置": {
			product: "源石碎片",
			recipe: "源石碎片",
			amount: 1,
			hours: 1,
			volume: 3,
			materials: {
				装置: 1,
				龙门币: 1e3
			}
		}
	},
	tradeOrdersByLevel: {
		1: [{
			name: "2贵金属订单",
			product: "龙门币",
			amount: 2,
			gold: 1e3,
			hours: 2.4,
			probability: 1
		}],
		2: [{
			name: "2贵金属订单",
			product: "龙门币",
			amount: 2,
			gold: 1e3,
			hours: 2.4,
			probability: .6
		}, {
			name: "3贵金属订单",
			product: "龙门币",
			amount: 3,
			gold: 1500,
			hours: 3.5,
			probability: .4
		}],
		3: [
			{
				name: "2贵金属订单",
				product: "龙门币",
				amount: 2,
				gold: 1e3,
				hours: 2.4,
				probability: .3
			},
			{
				name: "3贵金属订单",
				product: "龙门币",
				amount: 3,
				gold: 1500,
				hours: 3.5,
				probability: .5
			},
			{
				name: "4贵金属订单",
				product: "龙门币",
				amount: 4,
				gold: 2e3,
				hours: 4.6,
				probability: .2
			}
		]
	},
	orundumTradeOrder: M,
	tailorProbabilities: {
		"1α": [
			.15,
			.3,
			.55
		],
		"2α": [
			.13,
			.22,
			.65
		],
		"1α1β": [
			.05,
			.1,
			.85
		]
	},
	cluePreferenceByFaction: {
		莱茵生命: 1,
		企鹅物流: 2,
		黑钢国际: 3,
		乌萨斯学生自治团: 4,
		格拉斯哥帮: 5,
		喀兰贸易: 6,
		罗德岛制药: 7
	},
	resourceKeyAliases: {
		LMD: "龙门币",
		Orundum: "合成玉",
		"Pure Gold": "赤金",
		"Battle Record": "中级作战记录",
		"Originium Shard": "源石碎片",
		作战记录: "中级作战记录",
		贵金属: "赤金"
	},
	maxEliteLevelByRarity: {
		1: 0,
		2: 0,
		3: 1,
		4: 2,
		5: 2,
		6: 2
	}
};
function Ie(e, t) {
	return `${e}-${t + 1}`;
}
function Le(e) {
	let t = /* @__PURE__ */ new Map();
	return e.map((e) => {
		let n = t.get(e.type) ?? 0;
		return t.set(e.type, n + 1), {
			id: Ie(e.type, n),
			type: e.type,
			level: e.level,
			index: n
		};
	});
}
function Re(e) {
	return Ne[e] ?? Ne[1] ?? 107;
}
function ze(e, t, n = N) {
	return e === "meeting" ? n.meetingEfficiencyByLevel[t] ?? 107 : n.baseEfficiency[e] ?? 0;
}
function P(e, t, n = N) {
	if (!e) return;
	let r = j(e);
	return r === "源石碎片" ? n.manufactureRules[`源石碎片:${t || "固源岩"}`] : n.manufactureRules[r];
}
function Be(e) {
	return e.filter((e) => e.type === "dormitory").reduce((e, t) => e + t.level * 1e3, 0);
}
function Ve(e) {
	return e >= 4e3 ? 15 : e >= 3e3 ? 10 : e >= 2e3 ? 5 : 0;
}
function He(e) {
	return e >= 6 ? 5 : e === 5 ? 4 : e === 4 ? 2 : 0;
}
function Ue(e) {
	return e >= 2 ? 16 : e >= 1 ? 8 : 0;
}
//#endregion
//#region src/utils/efficiency/basePoints.ts
var We = [
	"cc.t.flow_gold",
	"cc.bd_a1",
	"cc.bd_malist",
	"cc.bd_a1_a1",
	"cc.bd_a1_a2",
	"cc.bd_dungeon",
	"cc.bd_felyne",
	"cc.bd_ash",
	"cc.bd_mujica",
	"cc.bd_b1",
	"cc.bd_wang_2",
	"cc.bd_A",
	"cc.bd_wang_1",
	"cc.bd_tachanka",
	"cc.bd_C",
	"cc.bd_B",
	"cc.bd_a1_a3"
];
function Ge(e, t) {
	return e.localeCompare(t, "zh-CN") || e.localeCompare(t);
}
function Ke(e, t) {
	return Ge(e.name, t.name) || e.key.localeCompare(t.key);
}
function qe(e) {
	return We.map((t) => ({
		key: t,
		name: e[t]?.name ?? t
	})).sort(Ke);
}
function Je(e, t, n) {
	return t.value - e.value || Ke({
		key: e.term,
		name: n[e.term]?.name ?? e.term
	}, {
		key: t.term,
		name: n[t.term]?.name ?? t.term
	});
}
function Ye(e, t) {
	return t.value - e.value || (e.kind === t.kind ? 0 : e.kind === "gain" ? -1 : 1) || xe.indexOf(e.facility) - xe.indexOf(t.facility) || e.facilityIndex - t.facilityIndex || e.slotIndex - t.slotIndex;
}
//#endregion
//#region src/utils/efficiency/model.ts
var F = 1e-6, Xe = 630 + 300 / 7, I = [
	"龙门币",
	"合成玉",
	"赤金",
	"中级作战记录",
	"源石碎片",
	"无人机",
	"信用",
	"公开招募标签刷新次数"
], L = /* @__PURE__ */ new Set([
	"tradeSpd",
	"manuProd",
	"clueSpeed",
	"hireSpd",
	"droneCharge",
	"abyssalBoost"
]), Ze = /* @__PURE__ */ new Set([
	"tradeSpd",
	"manuProd",
	"droneCharge",
	"clueSpeed",
	"hireSpd"
]), Qe = {
	trading: "tradeSpd",
	manufacture: "manuProd",
	power: "droneCharge",
	meeting: "clueSpeed",
	hire: "hireSpd"
}, R = /* @__PURE__ */ new Set(["orderLimit", "storageCap"]), $e = /* @__PURE__ */ new Set(["basePointGain", "basePointConvert"]), et = [
	"绮良",
	"鸿雪",
	"图耶"
], z = {
	operators: /* @__PURE__ */ new Set(),
	exceptSources: /* @__PURE__ */ new Set()
};
function B(e) {
	return Math.max(0, Math.min(24, Number.isFinite(e) ? e : 24));
}
function tt(e) {
	return typeof e == "object" && !!e && !Array.isArray(e);
}
function V(e, t, n) {
	return Ae(e, t, n.type, n.index).assignment;
}
function nt(e) {
	return e.facilities.filter((e) => e.type === "trading").some((t) => (V(e.document, e.index, t).operators ?? []).some((e) => et.includes(e)));
}
function rt(e, t) {
	return e.operatorStates?.[t] ?? {};
}
function it(e, t) {
	let n = e.firstItemProgress;
	if (typeof n == "number") return Math.max(0, Math.min(1, n));
	if (tt(n)) {
		let e = n[t] ?? n[t.replace(/-\d+$/, "")];
		return typeof e == "number" ? Math.max(0, Math.min(1, e)) : 0;
	}
	return 0;
}
//#endregion
//#region src/utils/efficiency/aggregate.ts
function at(e) {
	return typeof e == "number" ? e : e === "unowned" ? 8 : 9;
}
function ot(e) {
	return [...new Set(e)].sort((e, t) => at(e) - at(t));
}
function st(e, t) {
	return (e[0]?.facilities ?? []).map((n) => {
		let r = e.map((e) => e.facilities.find((e) => e.facility.id === n.facility.id)?.production).filter((e) => !!e), i = ot(e.flatMap((e) => e.facilities.find((e) => e.facility.id === n.facility.id)?.cluePreferences ?? []));
		if (r.length === 0 || t <= 1e-6) return n;
		let a = e.reduce((e, t) => {
			let r = t.facilities.find((e) => e.facility.id === n.facility.id)?.production;
			return r ? (e.base += r.baseAmountPerHour * t.durationHours, e.actual += r.amountPerHour * t.durationHours, e.effective += (r.effectiveAmountPerHour ?? r.amountPerHour) * t.durationHours, Object.entries(r.baseMaterialPerHour ?? r.materialPerHour ?? {}).forEach(([n, r]) => {
				e.baseMaterials[j(n)] = (e.baseMaterials[j(n)] ?? 0) + r * t.durationHours;
			}), Object.entries(r.materialPerHour ?? {}).forEach(([n, r]) => {
				e.materials[j(n)] = (e.materials[j(n)] ?? 0) + r * t.durationHours;
			}), Object.entries(r.effectiveMaterialPerHour ?? r.materialPerHour ?? {}).forEach(([n, r]) => {
				e.effectiveMaterials[j(n)] = (e.effectiveMaterials[j(n)] ?? 0) + r * t.durationHours;
			}), e) : e;
		}, {
			base: 0,
			actual: 0,
			effective: 0,
			baseMaterials: {},
			materials: {},
			effectiveMaterials: {}
		}), o = a.actual / t, s = a.effective / t, c = Object.fromEntries(Object.entries(a.baseMaterials).map(([e, n]) => [e, n / t])), l = Object.fromEntries(Object.entries(a.materials).map(([e, n]) => [e, n / t])), u = Object.fromEntries(Object.entries(a.effectiveMaterials).map(([e, n]) => [e, n / t]));
		return {
			...n,
			...i.length > 0 ? { cluePreferences: i } : {},
			production: {
				...n.production,
				product: j(r[0]?.product ?? n.production?.product ?? ""),
				...i.length > 0 ? { cluePreferences: i } : {},
				baseAmountPerHour: a.base / t,
				baseAmountPerDay: a.base / t * 24,
				...Object.keys(c).length > 0 ? { baseMaterialPerHour: c } : {},
				amountPerHour: o,
				amountPerDay: o * 24,
				...Object.keys(l).length > 0 ? { materialPerHour: l } : {},
				...Math.abs(s - o) > 1e-6 ? {
					effectiveAmountPerHour: s,
					effectiveAmountPerDay: s * 24,
					...Object.keys(u).length > 0 ? { effectiveMaterialPerHour: u } : {}
				} : {}
			}
		};
	});
}
function ct(e, t) {
	if (t <= 1e-6) return [];
	let n = /* @__PURE__ */ new Map();
	return e.forEach((e) => {
		e.facilities.forEach((t) => {
			let r = t.production;
			if (!r) return;
			let i = j(r.product), a = r.effectiveAmountPerHour ?? r.amountPerHour, o = n.get(i) ?? {
				basePerCycle: 0,
				actualPerCycle: 0,
				effectivePerCycle: 0,
				conversion: r.conversion,
				cluePreferences: [],
				baseMaterialsPerCycle: {},
				materialsPerCycle: {},
				effectiveMaterialsPerCycle: {}
			};
			!o.conversion && r.conversion && (o.conversion = r.conversion), o.cluePreferences = ot([...o.cluePreferences, ...r.cluePreferences ?? []]), o.basePerCycle += r.baseAmountPerHour * e.durationHours, o.actualPerCycle += r.amountPerHour * e.durationHours, o.effectivePerCycle += a * e.durationHours, Object.entries(r.baseMaterialPerHour ?? r.materialPerHour ?? {}).forEach(([t, n]) => {
				let r = j(t);
				o.baseMaterialsPerCycle[r] = (o.baseMaterialsPerCycle[r] ?? 0) + n * e.durationHours;
			}), Object.entries(r.materialPerHour ?? {}).forEach(([t, n]) => {
				let r = j(t);
				o.materialsPerCycle[r] = (o.materialsPerCycle[r] ?? 0) + n * e.durationHours;
			}), Object.entries(r.effectiveMaterialPerHour ?? r.materialPerHour ?? {}).forEach(([t, n]) => {
				let r = j(t);
				o.effectiveMaterialsPerCycle[r] = (o.effectiveMaterialsPerCycle[r] ?? 0) + n * e.durationHours;
			}), n.set(i, o);
		});
	}), Array.from(n, ([e, n]) => {
		let r = n.basePerCycle / t, i = n.actualPerCycle / t, a = n.effectivePerCycle / t, o = Object.fromEntries(Object.entries(n.materialsPerCycle).map(([e, n]) => [e, n / t])), s = Object.fromEntries(Object.entries(n.baseMaterialsPerCycle).map(([e, n]) => [e, n / t])), c = Object.fromEntries(Object.entries(n.effectiveMaterialsPerCycle).map(([e, n]) => [e, n / t]));
		return {
			product: e,
			...n.cluePreferences.length > 0 ? { cluePreferences: n.cluePreferences } : {},
			...n.conversion ? { conversion: n.conversion } : {},
			baseAmountPerHour: r,
			baseAmountPerDay: r * 24,
			...Object.keys(s).length > 0 ? { baseMaterialPerHour: s } : {},
			amountPerHour: i,
			amountPerDay: i * 24,
			...Math.abs(a - i) > 1e-6 ? {
				effectiveAmountPerHour: a,
				effectiveAmountPerDay: a * 24
			} : {},
			...Object.keys(o).length > 0 ? { materialPerHour: o } : {},
			...Math.abs(a - i) > 1e-6 && Object.keys(c).length > 0 ? { effectiveMaterialPerHour: c } : {}
		};
	});
}
function lt(e) {
	return e.effectiveAmountPerDay ?? e.amountPerDay;
}
function ut(e, t, n = N) {
	let r = /* @__PURE__ */ new Map(), i = /* @__PURE__ */ new Map();
	t.forEach((e) => {
		let t = j(e.product);
		t !== "线索" && r.set(t, lt(e));
		let n = e.effectiveMaterialPerHour ?? e.materialPerHour ?? {};
		Object.entries(n).forEach(([e, t]) => {
			let n = j(e);
			i.set(n, (i.get(n) ?? 0) + t * 24);
		});
	});
	let a = e.layout.filter((e) => e.type === "dormitory").reduce((e, t) => e + Math.floor(10 + t.level * 1e3 / 125), 0), o = t.find((e) => j(e.product) === "线索");
	r.set("信用", Xe + a + (o ? lt(o) * n.creditPerClue : 0));
	let s = I.flatMap((e) => {
		let t = r.get(e);
		return t === void 0 || Math.abs(t) <= 1e-6 ? [] : [{
			product: e,
			kind: "production",
			amountPerDay: t
		}];
	}), c = Array.from(i, ([e, t]) => ({
		product: e,
		kind: "net",
		amountPerDay: (r.get(e) ?? 0) + t,
		consumed: t
	})).filter((e) => e.consumed < -1e-6 && Math.abs(e.amountPerDay) > 1e-6).sort((e, t) => (I.indexOf(e.product) < 0 ? I.length : I.indexOf(e.product)) - (I.indexOf(t.product) < 0 ? I.length : I.indexOf(t.product)) || e.product.localeCompare(t.product)).map(({ product: e, kind: t, amountPerDay: n }) => ({
		product: e,
		kind: t,
		amountPerDay: n
	}));
	return [...s, ...c];
}
//#endregion
//#region src/utils/sanity.ts
var dt = 3, ft = 1e3, pt = 500, mt = {
	lmd: .0036,
	goldExperienceRatio: 1.2,
	orundum: .75,
	credit: 5.3271 / 129,
	recruitRefresh: 19.0787820209763,
	solidRock: null,
	device: null
}, ht = [
	{
		resource: "龙门币",
		label: "龙门币",
		amountUnit: "龙门币",
		amountFactor: 1,
		value: (e) => e.lmd
	},
	{
		resource: "合成玉",
		label: "合成玉",
		amountUnit: "合成玉",
		amountFactor: 1,
		value: (e) => e.orundum
	},
	{
		resource: "赤金",
		label: "赤金点数",
		amountUnit: "赤金点数",
		amountFactor: 500,
		value: (e) => e.pureGoldPoint
	},
	{
		resource: "中级作战记录",
		label: "作战记录（经验）",
		amountUnit: "经验",
		amountFactor: ft,
		value: (e) => e.experience
	},
	{
		resource: "无人机",
		label: "无人机",
		amountUnit: "无人机",
		amountFactor: 1,
		value: (e) => e.drone
	},
	{
		resource: "信用",
		label: "信用",
		amountUnit: "信用",
		amountFactor: 1,
		value: (e) => e.credit
	},
	{
		resource: "公开招募标签刷新次数",
		label: "公开招募标签刷新次数",
		amountUnit: "次",
		amountFactor: 1,
		value: (e) => e.recruitRefresh
	},
	{
		resource: "源石碎片",
		label: "源石碎片",
		amountUnit: "源石碎片",
		amountFactor: 1,
		value: (e) => e.originiumShard
	},
	{
		resource: "固源岩",
		label: "固源岩",
		amountUnit: "固源岩",
		amountFactor: 1,
		value: (e) => e.solidRock
	},
	{
		resource: "装置",
		label: "装置",
		amountUnit: "装置",
		amountFactor: 1,
		value: (e) => e.device
	}
];
function gt(e) {
	return e * 60 / 3;
}
function _t(e) {
	let t = e.goldExperienceRatio > 0 ? e.lmd / e.goldExperienceRatio : 0, n = t * ft, r = P("中级作战记录", void 0)?.hours ?? 0, i = P("赤金", void 0)?.hours ?? 0, a = gt(r), o = a > 0 ? n / a : 0, s = o * gt(i), c = (M.productAmount * e.orundum - gt(M.hours) * o) / M.materialAmount;
	return {
		lmd: e.lmd,
		goldExperienceRatio: e.goldExperienceRatio,
		orundum: e.orundum,
		pureGoldPoint: s / 500,
		experience: t,
		drone: o,
		credit: e.credit,
		recruitRefresh: e.recruitRefresh,
		originiumShard: c,
		solidRock: e.solidRock,
		device: e.device
	};
}
function vt(e, t, n) {
	if (n === 0) return;
	let r = j(t);
	ht.some((e) => e.resource === r) && (e[r] = (e[r] ?? 0) + n);
}
function yt(e, t, n) {
	let r = t.effectiveAmountPerHour ?? t.amountPerHour;
	t.product === "线索" ? vt(e, "信用", r * n * (t.conversion?.amountPerUnit ?? 0)) : vt(e, t.product, r * n);
	let i = t.effectiveMaterialPerHour ?? t.materialPerHour ?? {};
	Object.entries(i).forEach(([t, r]) => {
		vt(e, t, r * n);
	});
}
function bt(e, t) {
	let n = [], r = 0;
	return {
		items: ht.flatMap((i) => {
			let a = e[i.resource] ?? 0;
			if (Math.abs(a) <= 1e-6) return [];
			let o = a * i.amountFactor, s = i.value(t);
			if (s === null) return n.push(i.label), [{
				resource: i.resource,
				label: i.label,
				amount: o,
				amountUnit: i.amountUnit
			}];
			let c = o * s;
			return r += c, [{
				resource: i.resource,
				label: i.label,
				amount: o,
				amountUnit: i.amountUnit,
				sanityPerUnit: s,
				contribution: c
			}];
		}),
		total: r,
		complete: n.length === 0,
		missing: n
	};
}
function xt() {
	return ht;
}
//#endregion
//#region src/utils/efficiency/calculate.ts
function St(e) {
	return e.ruleset ?? N;
}
function Ct(e) {
	return e.effect.stat === "facBase" || Mn(e);
}
function wt(e, t, n, r, i, a, o) {
	let s = re(n, t);
	return v({
		operatorId: s?.id ?? t,
		facility: r.type,
		operatorSkillFile: s?.skillFile,
		maxEliteLevel: s?.maxEliteLevel,
		manualElite: i.elite,
		manualLevel: i.level,
		profile: e,
		treatSkillsAsUnlocked: a,
		dormitoryDefaultIncludesMoodRecovery: o
	});
}
function Tt(e, t) {
	let n = Number(e.unlock?.value ?? 0);
	return e.unlock?.type === "level" ? (t.level ?? 30) >= n : (t.elite ?? 0) >= n;
}
function Et(e, t, n, r) {
	let i = t ? t.chains.filter((e) => e.room === n).flatMap((e) => {
		let t = e.stages.filter((e) => Tt(e, r)).at(-1);
		return t ? t.effects.map((e) => ({
			skill: t.name,
			effect: e
		})) : [];
	}) : [], a = se(e), o = Qe[n];
	return a !== void 0 && o !== void 0 ? [...i, {
		skill: `${e}效率`,
		effect: {
			target: n,
			stat: o,
			value: a
		}
	}] : i;
}
function Dt(e, t, n, r = !1, i = !1) {
	let a = Le(e.layout), o = t.ruleset ?? N, s = be(e);
	return e.plans.map((c, l) => {
		let u = Math.max(0, Number(s.durations[l] ?? c.duration ?? o.defaultDurationMinutes) / 60), d = [], f = [];
		return a.forEach((a) => {
			let o = V(e, l, a);
			o.operators?.some(Boolean) && (o.operators ?? []).forEach((e, s) => {
				if (!e) return;
				let c = re(t, e);
				!c && !D(e, t) && f.push(`队列 ${l + 1}：找不到干员“${e}”的技能数据`);
				let u = rt(o, e), p = D(e, t), m = wt(n, e, t, a, u, r, i), h = {
					...u,
					elite: m.elite,
					level: m.level
				};
				d.push({
					name: e,
					facility: a,
					assignment: o,
					index: s,
					state: h,
					profile: c,
					skillFile: c?.skillFile,
					selected: Et(e, c?.skillFile, a.type, h),
					explicitMood: !p && Object.prototype.hasOwnProperty.call(u, "mood"),
					moodStart: p ? 24 : B(u.mood ?? 24),
					moodEnd: p ? 24 : B(u.mood ?? 24),
					costRate: 0,
					moodRateDetails: [],
					working: !0,
					workHoursBefore: 0,
					owned: !c || m.owned,
					fiammettaForced: !1
				});
			});
		}), {
			catalog: t,
			ruleset: o,
			document: e,
			plan: c,
			settings: e.settings ?? {},
			index: l,
			durationHours: u,
			facilities: a,
			placements: d,
			active: [],
			basePoints: {},
			basePointDetails: [],
			statValues: /* @__PURE__ */ new Map(),
			moodWarnings: [],
			autoRestWarnings: [],
			fiammettaWarnings: [],
			warnings: f
		};
	});
}
function H(e) {
	return je.includes(e.facility.type);
}
function U(e, t) {
	return e.facility.type !== "dormitory" && !D(e.name, t);
}
function W(e) {
	return e.working && (!H(e) || e.moodStart > 1e-6);
}
function G(e, t) {
	return e.placements.filter((e) => e.facility.id === t.id);
}
function K(e, t) {
	return e.placements.filter((e) => e.facility.type === t);
}
function q(e, t = !1) {
	return !t || e.moodStart > 1e-6;
}
function Ot(e, t, n) {
	if ($e.has(e.stat) || e.stat === "facilityCount" || e.stat === "skillTagConvert") return [void 0];
	if (e.target === "training" || e.target === "processing") return [];
	if (e.target === "any") return e.facilities?.length ? n.filter((t) => e.facilities?.includes(t.type)) : n.filter((e) => je.includes(e.type) || e.type === "dormitory");
	let r = e.target, i = n.filter((e) => e.type === r);
	return i.length === 0 ? [] : t.facility.type === r ? [t.facility] : i;
}
function kt(e, t, n = "ge") {
	return n === "gt" ? e > t : n === "le" ? e <= t : n === "lt" ? e < t : e >= t;
}
function At(e, t) {
	return typeof t == "number" ? t : t ? e.basePoints[t] ?? 0 : 0;
}
function jt(e, t, n, r, i) {
	return i.terms[n]?.members?.includes(t) ? !0 : r.active.some((r) => r.effect.stat === "skillTagConvert" && r.effect.tagTo === n && r.owner.facility.id === e.facility.id && r.effect.tagFrom?.some((e) => i.terms[e]?.members?.includes(t)) === !0);
}
function Mt(e, t, n) {
	return t === "same" ? G(e, n.facility) : t ? K(e, t) : [];
}
function Nt(e, t, n, r, i) {
	if (!e) return !0;
	let a;
	switch (e.type) {
		case "opAtFacility":
			a = Mt(r, e.facility, t).some((t) => t.name === String(e.op ?? "") && q(t, e.moodCheck));
			break;
		case "opInBase":
			a = r.placements.some((t) => t.name === String(e.op ?? "") && (!e.facilities?.length || e.facilities.includes(t.facility.type)) && q(t, e.moodCheck));
			break;
		case "opInFacilityAndTarget":
			a = r.placements.some((t) => t.name === String(e.op ?? "") && t.facility.type === e.facility && t.facility.id === n?.id && q(t, e.moodCheck));
			break;
		case "opGroupInFacility":
		case "opGroupNotInFacility": {
			let n = Mt(r, e.facility, t).filter((t) => q(t, e.moodCheck)).filter((n) => !e.other || n.name !== t.name).some((t) => O(i, e.group, t.name));
			a = e.type === "opGroupNotInFacility" ? !n : n;
			break;
		}
		case "opGroupCountInFacility":
			a = Mt(r, e.facility, t).filter((t) => q(t, e.moodCheck)).filter((t) => O(i, e.group, t.name)).filter((n) => !e.other || n.name !== t.name).length >= Number(e.min ?? 1);
			break;
		case "opGroupCountInBase":
			a = r.placements.filter((t) => !e.exclude?.includes(t.facility.type)).filter((t) => q(t, e.moodCheck)).filter((t) => O(i, e.group, t.name)).filter((n) => !e.other || n.name !== t.name).length >= Number(e.min ?? 1);
			break;
		case "onlySelf": {
			let e = r.placements.filter((e) => e.facility.id === t.facility.id && W(e));
			a = e.length === 1 && e[0]?.name === t.name;
			break;
		}
		case "clueExchanging":
			a = r.plan.rooms.meeting !== void 0 && r.settings.clueExchanging !== !1;
			break;
		case "moodCmp":
			a = kt(t.moodStart, Number(e.value ?? 0), e.op);
			break;
		case "moodDrop":
			a = kt(Ht(t, r.durationHours), Number(e.value ?? 0), e.op ?? "gt");
			break;
		case "termCmp":
			a = kt(At(r, e.a), At(r, e.b), e.op);
			break;
		case "statCmp": {
			let i = `${n?.id ?? t.facility.id}:${e.stat ?? ""}`, o = n?.type === "hire" ? ze(n.type, n.level, r.ruleset) : 0;
			a = kt(r.statValues.get(i) ?? 0, Number(e.value ?? 0) + o, e.op);
			break;
		}
		case "workHours":
			a = t.workHoursBefore + r.durationHours >= Number(e.value ?? 0);
			break;
		default: a = !1;
	}
	return e.negate ? !a : a;
}
function Pt(e, t) {
	return e.facilities.filter((e) => e.type === t).length + e.active.filter((e) => e.effect.stat === "facilityCount" && e.effect.target === t).reduce((e, t) => e + Number(t.effect.value ?? 0), 0);
}
function Ft(e, t) {
	return Math.max(0, e.settings.tradeOrderCount?.[t.id] ?? 0);
}
function It(e, t) {
	return t ? e.basePoints[t] ?? 0 : 0;
}
function Lt(e, t) {
	return e.selected.some((e) => e.skill === t && (e.effect.per?.source === "moodDrop" || e.effect.condition?.type === "moodDrop"));
}
function Rt(e) {
	return Lt(e.owner, e.skill);
}
function zt(e, t) {
	return e.moodStart <= 1e-6 ? 0 : e.costRate > 1e-6 ? Math.min(t, e.moodStart / e.costRate) : t;
}
function Bt(e, t) {
	return B(e.moodStart - e.costRate * t);
}
function Vt(e, t) {
	return 24 - Bt(e, t);
}
function Ht(e, t) {
	if (t <= 1e-6) return 0;
	let n = zt(e, t);
	return n <= 1e-6 ? 0 : (Vt(e, 0) + Vt(e, n)) / 2 * (n / t);
}
function Ut(e, t, n, r, i, a, o) {
	let s = r === "any" || !n ? t.facility : n, c = (e) => e === "same" || !e ? G(i, s) : K(i, e), l = 0;
	switch (e.source) {
		case "basePoint":
			l = It(i, e.term);
			break;
		case "facilityCount":
			l = Pt(i, e.facility ?? "power");
			break;
		case "facilityLevel":
			l = i.facilities.filter((t) => t.type === (e.facility ?? "trading")).reduce((e, t) => e + t.level, 0);
			break;
		case "facilityLevelTotal":
			l = i.facilities.reduce((e, t) => e + t.level, 0);
			break;
		case "ownLevel":
			l = n?.level ?? t.facility.level;
			break;
		case "trainLevel":
			l = i.facilities.filter((e) => e.type === "training").reduce((e, t) => e + t.level, 0);
			break;
		case "dormLevel":
			l = i.facilities.filter((e) => e.type === "dormitory").reduce((e, t) => e + t.level, 0);
			break;
		case "dormHere": {
			let e = t.facility.type === "dormitory" ? t.facility : void 0;
			if (!e) break;
			l = i.settings.dormFullTreat === !1 ? G(i, e).length : Ee("dormitory", e.level);
			break;
		}
		case "dormOccupants":
			l = i.facilities.filter((e) => e.type === "dormitory").reduce((e, t) => e + (i.settings.dormFullTreat === !1 ? G(i, t).length : Ee("dormitory", t.level)), 0);
			break;
		case "dormOccupantsOwn":
			l = t.facility.type === "dormitory" ? G(i, t.facility).filter((e) => e.name !== t.name).length : 0;
			break;
		case "dormNotFull":
			l = t.facility.type === "dormitory" ? G(i, t.facility).filter((e) => e.moodStart < 24 - F).length : 0;
			break;
		case "recruitSlots":
			l = i.facilities.filter((e) => e.type === "hire").reduce((e, t) => e + Math.max(0, t.level - 1), 0);
			break;
		case "opCount":
			l = c(e.facility).filter((t) => q(t, e.moodCheck)).filter((n) => !e.other || n.name !== t.name).length;
			break;
		case "opGroupInBase":
			l = i.placements.filter((t) => !e.exclude?.includes(t.facility.type)).filter((t) => q(t, e.moodCheck)).filter((t) => O(a, e.group, t.name)).filter((n) => !e.other || n.name !== t.name).length;
			break;
		case "opGroupInFacility":
			l = c(e.facility).filter((t) => q(t, e.moodCheck)).filter((t) => O(a, e.group, t.name)).filter((n) => !e.other || n.name !== t.name).filter((t) => !e.fullMood || t.moodStart >= 24 - 1e-6).length;
			break;
		case "baseFacilityWithGroup":
			l = i.facilities.filter((t) => G(i, t).some((t) => O(a, e.group, t.name) && q(t, e.moodCheck))).length;
			break;
		case "skillOwners": {
			let t = a.terms[e.term ?? ""]?.members ?? [];
			l = K(i, "control").filter((t) => q(t, e.moodCheck)).filter((e) => e.selected.some((e) => t.includes(e.skill))).length;
			break;
		}
		case "skillTagCount":
			l = c(e.facility).filter((t) => q(t, e.moodCheck)).reduce((t, n) => t + n.selected.filter(({ skill: t }) => jt(n, t, e.tag ?? "", i, a)).length, 0);
			break;
		case "stat": {
			let r = e.stat ?? "", i = n?.id ?? t.facility.id, a = e.statScope === "targetFacility" ? o.bonusByFacility : o.sameFacilityBonusByFacility ?? o.bonusByFacility;
			l = Object.entries(a[i] ?? {}).filter(([n]) => !e.other || n !== t.name).reduce((e, [, t]) => e + (Number(t[r]) || 0), 0);
			break;
		}
		case "facCap":
			l = Object.values(o.capBoosts[e.stat ?? "storageCap"] ?? {}).reduce((e, t) => e + t, 0);
			break;
		case "capTier": {
			let t = e.tiers ?? [];
			l = Object.values(o.capBoosts[e.stat ?? "storageCap"] ?? {}).reduce((e, n) => {
				if (n <= 0 || t.length === 0) return e;
				let r = t.find((e) => e.cap === void 0 || n <= e.cap) ?? t[t.length - 1];
				return e + n * Number(r?.value ?? 0);
			}, 0);
			break;
		}
		case "moodDrop":
			l = Ht(t, i.durationHours);
			break;
		case "orderCount":
			l = n ? Ft(i, n) : 0;
			break;
		case "orderLimitNet":
			l = o.capBoosts.orderLimit ? Object.values(o.capBoosts.orderLimit).reduce((e, t) => e + t, 0) : 0;
			break;
		case "droneLimit":
			l = St(a).droneLimit;
			break;
		case "manuRecipes":
			l = new Set(i.facilities.filter((e) => e.type === "manufacture").map((e) => {
				let t = V(i.document, i.index, e);
				return P(t.product, t.sourceMaterial, St(a))?.recipe;
			}).filter((e) => !!e)).size;
			break;
		case "abyssalBoost": {
			let t = c("same").filter((t) => O(a, e.group, t.name) && q(t, e.moodCheck)).length, n = i.placements.filter((e) => e.facility.type === "manufacture").filter((t) => O(a, e.group, t.name) && q(t, e.moodCheck)).length, r = t * n * Number(e.value ?? 0);
			return {
				value: e.capUnit === "value" ? Math.min(r, Number(e.cap ?? Infinity)) : r,
				count: t,
				times: t * n
			};
		}
		default: l = 0;
	}
	let u = Math.max(F, Number(e.per) || 1), d = e.floor ?? e.source !== "facCap" ? e.source === "stat" && e.statScope === "targetFacility" ? Math.floor(l / u) : Math.max(0, Math.floor(l / u)) : l / u, f = d * (Number(e.value) || 0);
	return {
		value: e.capUnit === "value" ? Math.min(f, Number(e.cap ?? Infinity)) : e.cap === void 0 ? f : Math.min(d, e.cap) * (Number(e.value) || 0),
		count: l,
		times: d
	};
}
function Wt(e, t, n) {
	let r = 0, i = [];
	for (let a = 1; a <= Math.ceil(t); a += 1) {
		let o = Math.max(0, Math.min(1, t - (a - 1))), s = Math.min(e.startValue + (n + a - e.startHours) * e.step, e.cap);
		r += s * o, i.push({
			hour: a,
			weight: o,
			value: s
		});
	}
	return {
		value: t > 1e-6 ? r / t : 0,
		steps: i
	};
}
function Gt(e, t) {
	let n = Math.max(F, Number(e.per) || 1), r = e.floor ?? !0 ? Math.max(0, Math.floor(t / n)) : Math.max(0, t / n), i = r * (Number(e.value) || 0);
	return e.capUnit === "value" ? Math.min(i, Number(e.cap ?? Infinity)) : e.cap === void 0 ? i : Math.min(r, e.cap) * (Number(e.value) || 0);
}
function Kt(e, t) {
	let n = kt(t, Number(e.value ?? 0), e.op ?? "gt");
	return e.negate ? !n : n;
}
function qt(e, t, n, r, i, a) {
	let { effect: o, owner: s } = e, c = Xt(i, a), l = zt(s, n.durationHours);
	if (a > l + 1e-6 || a >= l - 1e-6 && Bt(s, a) <= 1e-6) return 0;
	let u;
	if (u = o.per?.source === "moodDrop" ? Gt(o.per, Vt(s, a)) : o.curve ? Math.min(o.curve.startValue + (s.workHoursBefore + a - o.curve.startHours) * o.curve.step, o.curve.cap) : o.per ? Ut(o.per, s, t, o.target, n, r, c).value : Number(o.value ?? 0) + Number(o.baseValue ?? 0), o.condition?.type === "moodDrop" && !Kt(o.condition, Vt(s, a))) return 0;
	if (o.condition?.type === "workHours") {
		let e = Number(o.condition.value ?? 0);
		if (s.workHoursBefore + a < e) return 0;
	}
	return u;
}
function Jt(e, t) {
	let { effect: n, owner: r } = e, i = zt(r, t), a = [0, i], o = r.costRate;
	if (Math.abs(o) > 1e-6) {
		let e = Vt(r, 0), t = (t) => {
			let n = (t - e) / o;
			n > 1e-6 && n < i - 1e-6 && a.push(n);
		};
		if (n.per?.source === "moodDrop") {
			let e = Math.max(F, Number(n.per.per) || 1);
			for (let n = 0; n <= 24 + F; n += e) t(n);
		}
		n.condition?.type === "moodDrop" && t(Number(n.condition.value ?? 0));
	}
	if (n.condition?.type === "workHours") {
		let e = Number(n.condition.value ?? 0) - r.workHoursBefore;
		e > 1e-6 && e < i - 1e-6 && a.push(e);
	}
	return Array.from(new Set(a.map((e) => Math.max(0, e)))).sort((e, t) => e - t);
}
function Yt(e, t, n, r, i) {
	let a = n.durationHours;
	if (a <= 1e-6) return 0;
	let o = Array.from(/* @__PURE__ */ new Set([...Jt(e, a), ...(i.capacitySegments ?? []).flatMap(({ startHours: e, endHours: t }) => [e, t])])).sort((e, t) => e - t), s = 0;
	for (let a = 1; a < o.length; a += 1) {
		let c = o[a - 1] ?? 0, l = o[a] ?? c;
		l <= c + 1e-6 || (s += qt(e, t, n, r, i, (c + l) / 2) * (l - c));
	}
	return s / a;
}
function Xt(e, t) {
	let n = e.capacitySegments;
	if (!n || n.length === 0) return e;
	let r = n.find((e) => t >= e.startHours - 1e-6 && t < e.endHours - 1e-6) ?? (t <= (n.at(-1)?.endHours ?? 0) + 1e-6 ? n.at(-1) : void 0);
	return r ? {
		...e,
		capBoosts: r.capBoosts
	} : e;
}
function Zt(e, t, n, r, i) {
	let a = n.durationHours, o = i.capacitySegments;
	return a <= 1e-6 || !o || o.length === 0 ? 0 : o.reduce((a, o) => {
		let s = Math.max(0, o.endHours - o.startHours);
		if (s <= 1e-6) return a;
		let c = Xt(i, (o.startHours + o.endHours) / 2);
		return a + Ut(e.effect.per, e.owner, t, e.effect.target, n, r, c).value * s;
	}, 0) / a;
}
function Qt(e, t) {
	if (e.effect.condition?.type !== "workHours") return;
	let n = Number(e.effect.condition.value ?? 0);
	return {
		threshold: n,
		activeHours: Math.max(0, Math.min(t.durationHours, e.owner.workHoursBefore + t.durationHours - n))
	};
}
function J(e, t, n, r, i) {
	if (Rt(e)) return Yt(e, t, n, r, i);
	if ((e.effect.per?.source === "facCap" || e.effect.per?.source === "capTier") && (i.capacitySegments?.length ?? 0) > 1) return Zt(e, t, n, r, i);
	let { effect: a, owner: o } = e, s;
	s = a.curve ? Wt(a.curve, n.durationHours, o.workHoursBefore).value : a.per ? Ut(a.per, o, t, a.target, n, r, i).value : Number(a.value ?? 0) + Number(a.baseValue ?? 0);
	let c = Qt(e, n);
	return c && (s *= n.durationHours > 1e-6 ? c.activeHours / n.durationHours : 0), s;
}
function $t(e, t) {
	let { effect: n, owner: r } = e, i = Qt(e, t);
	if (n.curve) {
		let e = Wt(n.curve, t.durationHours, r.workHoursBefore);
		return {
			type: "curve",
			beforeHours: r.workHoursBefore,
			durationHours: t.durationHours,
			startValue: n.curve.startValue,
			startHours: n.curve.startHours,
			step: n.curve.step,
			cap: n.curve.cap,
			steps: e.steps,
			...i ? { workHours: i } : {}
		};
	}
	if (i) return {
		type: "workHours",
		beforeHours: r.workHoursBefore,
		durationHours: t.durationHours,
		threshold: i.threshold,
		activeHours: i.activeHours,
		baseValue: Number(n.value ?? 0) + Number(n.baseValue ?? 0)
	};
}
function en(e, t, n, r) {
	let { effect: i, owner: a } = e;
	return !(e.target?.id !== n.id || i.other && t.name === a.name || i.scope === "op" && t.name !== i.op || i.scope === "room" && t.facility.id !== a.facility.id || i.moodBelow !== void 0 && !(t.moodStart < Number(i.moodBelow)) || i.scopeGroup && !O(r, i.scopeGroup, t.name) || !i.scope && i.target !== "any" && t.name !== a.name);
}
function tn(e, t, n = !1) {
	let r = [];
	return e.placements.filter((e) => W(e)).forEach((i) => {
		i.selected.forEach(({ skill: a, effect: o }) => {
			n && o.condition?.type === "statCmp" || Ot(o, i, e.facilities).forEach((n) => {
				(o.condition?.type === "moodDrop" && (L.has(o.stat) || R.has(o.stat)) || Nt(o.condition, i, n, e, t)) && r.push({
					owner: i,
					effect: o,
					skill: a,
					target: n
				});
			});
		});
	}), r;
}
function nn(e, t) {
	if (typeof e.cluePreference == "number" || e.cluePreference === "unowned" || e.cluePreference === "owned") return e.cluePreference;
	let n = e.text ?? "";
	return n.includes("尚未拥有") ? "unowned" : n.includes("已经拥有") ? "owned" : Object.entries(St(t).cluePreferenceByFaction).find(([e]) => n.includes(e))?.[1];
}
function rn(e) {
	return typeof e == "number" ? e : e === "unowned" ? 8 : 9;
}
function an(e) {
	return [...new Set(e)].sort((e, t) => rn(e) - rn(t));
}
function on(e, t) {
	return an(e.active.filter((e) => e.target?.id === t.id && e.effect.stat === "clueChance").map((t) => nn(t.effect, e.catalog)).filter((e) => e !== void 0));
}
function sn(e, t, n) {
	let r = e[t] ?? (e[t] = []), i = r.find((e) => e.kind === n.kind && e.operator === n.operator && e.skill === n.skill && e.facility === n.facility && e.facilityIndex === n.facilityIndex && e.slotIndex === n.slotIndex && e.from === n.from && e.rate === n.rate);
	i ? i.value += n.value : r.push(n);
}
function cn(e) {
	let t = e.filter((e) => e.effect.stat === "basePointConvert" && !!e.effect.from && !!e.effect.to), n = [];
	for (; t.length > 0;) {
		let e = t.findIndex((e) => !t.some((t) => t !== e && t.effect.to === e.effect.from)), [r] = t.splice(e >= 0 ? e : 0, 1);
		r && n.push(r);
	}
	return n;
}
function ln(e) {
	return e.effect.stat === "basePointGain" && e.effect.per?.source === "basePoint" && e.effect.per.term === e.effect.term;
}
function un(e, t, n, r) {
	let i = {}, a = {};
	return e.basePoints = i, e.facilities.filter((e) => e.type === "manufacture").filter((t) => {
		let n = V(e.document, e.index, t);
		return P(n.product, n.sourceMaterial, e.ruleset)?.recipe === "贵金属";
	}).forEach((e) => {
		i["cc.t.flow_gold"] = (i["cc.t.flow_gold"] ?? 0) + 1, sn(a, "cc.t.flow_gold", {
			kind: "gain",
			operator: "生产赤金",
			facility: "manufacture",
			facilityIndex: e.index,
			slotIndex: 0,
			value: 1
		});
	}), e.basePoints = { ...i }, t.filter(ln).forEach((t) => {
		let o = t.effect.term;
		if (!o) return;
		let s = J(t, t.target, e, n, r);
		i[o] = (i[o] ?? 0) + s, s > 1e-6 && sn(a, o, {
			kind: "gain",
			operator: t.owner.name,
			skill: t.skill,
			facility: t.owner.facility.type,
			facilityIndex: t.owner.facility.index,
			slotIndex: t.owner.index,
			value: s
		});
	}), e.basePoints = i, t.filter((e) => e.effect.stat === "basePointGain").filter((e) => !ln(e)).forEach((t) => {
		let o = t.effect.term;
		if (!o) return;
		let s = J(t, t.target, e, n, r);
		i[o] = (i[o] ?? 0) + s, s > 1e-6 && sn(a, o, {
			kind: "gain",
			operator: t.owner.name,
			skill: t.skill,
			facility: t.owner.facility.type,
			facilityIndex: t.owner.facility.index,
			slotIndex: t.owner.index,
			value: s
		});
	}), cn(t).forEach((e) => {
		let t = e.effect.from, n = e.effect.to;
		if (!t || !n) return;
		let r = Math.max(0, (i[t] ?? 0) * Number(e.effect.rate ?? 0));
		i[n] = (i[n] ?? 0) + r, r > 1e-6 && sn(a, n, {
			kind: "convert",
			operator: e.owner.name,
			skill: e.skill,
			facility: e.owner.facility.type,
			facilityIndex: e.owner.facility.index,
			slotIndex: e.owner.index,
			value: r,
			from: t,
			rate: Number(e.effect.rate ?? 0)
		});
	}), {
		points: i,
		details: Object.entries(i).filter(([t, n]) => n > 1e-6 && (t !== "cc.t.flow_gold" || nt(e))).map(([e, t]) => ({
			term: e,
			value: t,
			sources: [...a[e] ?? []].sort(Ye)
		})).sort((e, t) => Je(e, t, n.terms))
	};
}
function dn(e, t, n) {
	let r = /* @__PURE__ */ new Map();
	return e.facilities.forEach((i) => {
		let a = {
			capBoosts: {},
			bonusByFacility: {}
		}, o = jn(e, i), s = Z(e, i, n, t, a, z, /* @__PURE__ */ new Set([...L, "facBase"]), "base"), c = Z(e, i, n, t, a, o, L, "combination"), l = Z(e, i, n, t, a, o, L, "combination", "stat"), u = G(e, i).reduce((e, t) => e + Rn(i, t), 0), d = ze(i.type, i.level, e.ruleset);
		if (i.type === "meeting") {
			let t = e.facilities.filter((e) => e.type === "dormitory").reduce((e, t) => e + t.level * 1e3, 0);
			d += Ve(t);
		}
		r.set(`${i.id}:${i.type === "hire" ? "hireSpd" : i.type === "trading" ? "tradeSpd" : i.type === "manufacture" ? "manuProd" : "clueSpeed"}`, d + s.total + u + c.total + l.total);
	}), r;
}
function fn(e, t, n, r) {
	if (D(t.name, n) || !W(t) || !H(t)) return {
		rate: 0,
		details: []
	};
	let i = [{
		kind: "base",
		value: 1
	}], a = K(e, "control").filter((e) => W(e)).length, o = 1 - a * .05;
	if (a > 0 && i.push({
		kind: "controlWorkers",
		value: -a * .05,
		count: a
	}), t.facility.type === "trading" || t.facility.type === "manufacture") {
		let n = G(e, t.facility).filter((e) => W(e)).length;
		n >= 3 ? (o -= .1, i.push({
			kind: "facilityWorkers",
			value: -.1,
			count: n
		})) : n === 2 && (o -= .05, i.push({
			kind: "facilityWorkers",
			value: -.05,
			count: n
		}));
	}
	let s = e.active.filter((e) => e.effect.stat === "zeroOpMood").some((e) => en(e, t, t.facility, n) || e.effect.group && O(n, e.effect.group, t.name));
	return pn(e, t, n, r).flatMap(({ item: e, value: t }) => {
		let n = e.effect.stat === "moodRecover" ? -t : t;
		return s && n > 0 ? [] : [{
			cost: n,
			detail: {
				kind: "skill",
				value: n,
				operator: e.owner.name,
				skill: e.skill,
				stat: e.effect.stat
			}
		}];
	}).forEach(({ cost: e, detail: t }) => {
		o += e, i.push(t);
	}), {
		rate: o,
		details: i
	};
}
function pn(e, t, n, r) {
	let i = [], a = /* @__PURE__ */ new Map();
	e.active.filter((e) => e.effect.stat === "moodCost" || e.effect.stat === "moodRecover").filter((e) => en(e, t, t.facility, n)).forEach((o) => {
		let s = J(o, t.facility, e, n, r);
		if (o.effect.stack !== "max") {
			i.push({
				item: o,
				value: s
			});
			return;
		}
		let c = o.effect.maxGroup ?? `${o.effect.target}|${o.effect.stat}|${o.effect.recipe ?? ""}`, l = a.get(c) ?? /* @__PURE__ */ new Map(), u = l.get(o.owner.name) ?? [];
		u.push({
			item: o,
			value: s
		}), l.set(o.owner.name, u), a.set(c, l);
	});
	let o = [...i];
	return a.forEach((e) => {
		let t = "", n = -Infinity;
		e.forEach((e, r) => {
			let i = e.reduce((e, t) => e + t.value, 0);
			i < n || (t = r, n = i);
		}), t && o.push(...e.get(t) ?? []);
	}), o;
}
function mn(e) {
	return e.fiammettaMode === "queue" ? "queue" : "direct";
}
function hn(e, t) {
	return (mn(e.settings) === "queue" ? e.document.fiammetta?.queue?.[t] : t === 0 ? e.document.fiammetta?.direct : void 0)?.operators?.find(Boolean);
}
function gn(e) {
	return e.fiammetta?.direct?.operators?.filter(Boolean) ?? [];
}
function _n(e) {
	return e.some((e) => e.placements.some((e) => e.name === "菲亚梅塔" && e.facility.type === "dormitory"));
}
function vn(e, t, n) {
	return !n || t.name === "菲亚梅塔" ? !1 : mn(e.settings) === "queue" ? hn(e, e.index) === t.name : gn(e.document).includes(t.name);
}
function yn(e, t) {
	let n = e.placements.find((e) => e.name === "菲亚梅塔" && e.facility.type === "dormitory");
	return n ? n.selected.filter(({ effect: e }) => e.stat === "moodRecover").reduce((r, { effect: i, skill: a }) => r + J({
		owner: n,
		effect: i,
		skill: a,
		target: n.facility
	}, n.facility, e, t, On()), 0) : 0;
}
function bn(e, t) {
	if (e.forEach((e) => {
		e.fiammettaWarnings = [];
	}), !_n(e)) {
		e.forEach((e) => {
			e.fiammetta = void 0;
		});
		return;
	}
	let n = mn(e[0]?.settings ?? {}), r = [];
	if (n === "queue") {
		let i = 24;
		return e.forEach((n, a) => {
			let o = hn(n, a), s = (a - 1 + e.length) % e.length, c = (o ? e[s]?.placements.find((e) => e.name === o) : void 0)?.moodEnd ?? 24;
			o && i < 24 - 1e-6 && e.length > 1 && e[s]?.fiammettaWarnings.push(`菲亚梅塔在${s + 1}队列结束后无法恢复心情`);
			let l = i;
			o && (i = c);
			let u = yn(n, t), d = u * n.durationHours > 1e-6 ? u * n.durationHours : 0, f = B(i + (u > 1e-6 ? d : 0));
			n.fiammetta = {
				...o ? { target: o } : {},
				targetMood: c,
				start: l,
				end: f,
				recoverRate: u,
				recoverHours: d,
				resting: u > F
			}, r.push(n.fiammetta), i = f;
		}), {
			mode: n,
			plans: r,
			directTargets: [],
			totalConsumption: 0,
			totalRecovery: r.reduce((e, t) => e + (t?.recoverHours ?? 0), 0)
		};
	}
	let i = gn(e[0].document), a = 0, o = 0;
	return e.forEach((e) => {
		let n = yn(e, t), s = n * e.durationHours;
		o += s, e.placements.forEach((t) => {
			i.includes(t.name) && H(t) && (a += t.costRate * e.durationHours);
		}), e.fiammetta = {
			target: i[e.index],
			targetMood: (i[e.index], 24),
			start: 24,
			end: 24,
			recoverRate: n,
			recoverHours: s,
			resting: n > F
		}, r.push(e.fiammetta);
	}), a > o + 1e-6 && i.length > 0 && e[0]?.fiammettaWarnings.push("菲亚梅塔无法完全恢复这些干员心情"), {
		mode: n,
		plans: r,
		directTargets: i,
		totalConsumption: a,
		totalRecovery: o
	};
}
function xn(e, t, n) {
	for (let r = 1; r <= e.length; r += 1) {
		let i = e[(t + r) % e.length]?.placements.find((e) => e.name === n && H(e));
		if (i) return i.fiammettaForced ? 24 : i.explicitMood ? B(i.state.mood ?? 24) : 24;
	}
	return 24;
}
function Sn(e, t, n, r) {
	let { effect: i, owner: a } = e;
	return !(e.target?.id !== n.id || i.other && t.name === a.name || i.scope === "self" && t.name !== a.name || i.scope === "op" && t.name !== i.op || i.scope === "room" && a.facility.type === "dormitory" && a.facility.id !== n.id || i.op && t.name !== i.op || i.moodBelow !== void 0 && !(t.moodStart < Number(i.moodBelow)) || i.scopeGroup && !O(r, i.scopeGroup, t.name) || !i.scope && i.target !== "any" && t.name !== a.name);
}
function Cn(e, t, n, r) {
	let i = 0, a = /* @__PURE__ */ new Map();
	return e.forEach((e) => {
		let o = J(e, t, n, r, On());
		if (e.effect.stack !== "max") {
			i += o;
			return;
		}
		let s = e.effect.maxGroup ?? `${e.effect.target}|${e.effect.stat}|${e.effect.recipe ?? ""}`, c = a.get(s) ?? /* @__PURE__ */ new Map();
		c.set(e.owner.name, (c.get(e.owner.name) ?? 0) + o), a.set(s, c);
	}), a.forEach((e) => {
		i += Math.max(...e.values());
	}), i;
}
function wn(e, t, n, r, i, a) {
	let o = e.active.filter((e) => e.target?.id === t.id && e.effect.stat === "moodRecover"), s = o.filter((e) => e.owner.name === n.name);
	if (s.some((e) => e.effect.blockOtherRecovery === !0)) return Cn(s.filter((e) => e.effect.scope === "self"), t, e, a);
	let c = (e) => Sn(e, n, t, a), l = o.filter((e) => e.effect.subjects === void 0 && (e.effect.scope === "room" || e.owner.facility.type !== "dormitory") && c(e)), u = s.filter((e) => e.effect.scope === "self" && c(e)), d = r.filter((e) => e.moodStart < (i.get(e.name) ?? 24) - F), f = o.filter((e) => e.effect.subjects === "single" && d.slice().sort((e, t) => e.moodStart - t.moodStart || e.index - t.index)[0]?.name === n.name && c(e)), p = d.length, m = p > 0 ? o.filter((e) => e.effect.subjects === "spread").filter(c).map((n) => ({
		...n,
		effect: {
			...n.effect,
			value: J(n, t, e, a, On()) / p,
			baseValue: void 0,
			per: void 0,
			curve: void 0
		}
	})) : [];
	return 1.5 + .5 * t.level + Cn(l, t, e, a) + Cn(u, t, e, a) + Cn(f, t, e, a) + Cn(m, t, e, a);
}
function Tn(e, t, n, r, i, a) {
	let o = rt(t.assignment, t.name), s = wt(e.settings.progressionProfile, t.name, a, n, o, e.settings.treatSkillsAsUnlocked ?? !1, e.settings.dormitoryDefaultIncludesMoodRecovery ?? !1), c = {
		...o,
		elite: s.elite,
		level: s.level
	}, l = re(a, t.name);
	return {
		...t,
		facility: n,
		assignment: V(e.document, e.index, n),
		index: r,
		state: c,
		profile: l,
		skillFile: l?.skillFile,
		selected: Et(t.name, l?.skillFile, "dormitory", c),
		explicitMood: !1,
		moodStart: i,
		moodEnd: i,
		costRate: 0,
		moodRateDetails: [],
		working: !0,
		workHoursBefore: 0,
		owned: s.owned,
		fiammettaForced: !1
	};
}
function En(e, t) {
	e.length <= 1 || e.forEach((n, r) => {
		let i = e[(r - 1 + e.length) % e.length];
		if (!i) return;
		n.autoRestWarnings = [];
		let a = [];
		i.placements.forEach((i, o) => {
			if (!U(i, t)) return;
			let s = xn(e, r, i.name);
			if (i.moodEnd >= s - 1e-6) return;
			let c = n.placements.find((e) => e.name === i.name);
			n.placements.some((e) => e.name === i.name && e.facility.type !== "dormitory" && W(e)) || a.some((e) => e.source.name === i.name) || a.push({
				source: i,
				current: c,
				expectedMood: s,
				startMood: i.moodEnd,
				order: o
			});
		}), a.sort((e, t) => e.startMood - t.startMood || e.order - t.order);
		let o = n.facilities.filter((e) => e.type === "dormitory").sort((e, t) => t.level - e.level || e.index - t.index), s = new Map(o.map((e) => [e.id, new Set(n.placements.filter((t) => t.facility.id === e.id).map((e) => e.index))]));
		a.forEach((e) => {
			let t = n.placements.find((t) => t.name === e.source.name && t.facility.type === "dormitory");
			if (t) {
				e.dormitory = t.facility, e.slotIndex = t.index, e.restPlacement = t;
				return;
			}
			for (let t of o) {
				let n = Ee("dormitory", t.level), r = s.get(t.id) ?? /* @__PURE__ */ new Set(), i = Array.from({ length: n }, (e, t) => t).find((e) => !r.has(e));
				if (i !== void 0) {
					r.add(i), s.set(t.id, r), e.dormitory = t, e.slotIndex = i;
					break;
				}
			}
		});
		let c = n.placements, l = n.active, u = /* @__PURE__ */ new Set(), d = /* @__PURE__ */ new Map(), f = [];
		a.forEach((e) => {
			if (!e.dormitory || e.slotIndex === void 0) {
				n.autoRestWarnings.push({
					operator: e.source.name,
					reason: "no-space",
					startMood: e.startMood,
					endMood: e.startMood,
					expectedMood: e.expectedMood
				});
				return;
			}
			if (e.restPlacement) {
				d.set(e.restPlacement, {
					start: e.restPlacement.moodStart,
					end: e.restPlacement.moodEnd
				}), e.restPlacement.moodStart = e.startMood, e.restPlacement.moodEnd = e.startMood;
				return;
			}
			e.current && u.add(e.current), f.push(Tn(n, e.current ?? e.source, e.dormitory, e.slotIndex, e.startMood, t));
		});
		try {
			n.placements = [...c.filter((e) => !u.has(e)), ...f], n.active = tn(n, t);
			let i = /* @__PURE__ */ new Map();
			n.placements.filter((e) => e.facility.type === "dormitory").forEach((t) => i.set(t.name, xn(e, r, t.name))), a.forEach((e) => {
				if (!e.dormitory || e.slotIndex === void 0) return;
				let r = e.restPlacement ?? f.find((t) => t.name === e.source.name);
				if (!r) return;
				let a = n.placements.filter((t) => t.facility.id === e.dormitory?.id), o = wn(n, e.dormitory, r, a, i, t), s = Math.min(e.expectedMood, B(e.startMood + o * n.durationHours));
				s < e.expectedMood - 1e-6 && n.autoRestWarnings.push({
					operator: e.source.name,
					reason: "not-recovered",
					startMood: e.startMood,
					endMood: s,
					expectedMood: e.expectedMood,
					facilityId: e.dormitory.id,
					facilityIndex: e.dormitory.index
				});
			});
		} finally {
			d.forEach((e, t) => {
				t.moodStart = e.start, t.moodEnd = e.end;
			}), n.placements = c, n.active = l;
		}
	});
}
function Dn(e, t) {
	let n = (t, n) => {
		if (e.length <= 1) return {};
		let r = e[(t - 1 + e.length) % e.length];
		return {
			placement: r?.placements.find(n),
			context: r
		};
	}, r = (t, n) => {
		if (e.length <= 1) return {};
		let r = e[(t - 1 + e.length) % e.length];
		return {
			placement: r?.placements.find((e) => e.name === n.name && e.facility.id === n.facility.id && e.index === n.index),
			context: r
		};
	}, i = (e, t) => n(e, (e) => e.name === t.name), a = _n(e);
	e.forEach((e) => {
		e.placements.forEach((t) => {
			t.fiammettaForced = vn(e, t, a);
		});
	});
	let o = new Set(e.flatMap((e) => e.placements.filter((e) => e.fiammettaForced).map((e) => e.name))), s = new Set(e.length > 1 ? e[0]?.placements.map((e) => e.name).filter((n) => !o.has(n) && e.every((e) => {
		let r = e.placements.find((e) => e.name === n);
		return !!r && U(r, t) && !r.explicitMood;
	})).filter((t) => e.some((e) => {
		let n = e.placements.find((e) => e.name === t);
		return !!n && H(n);
	})) : []), c = /* @__PURE__ */ new Map(), l = (e, n) => !!e && U(e, t) && U(n, t), u = (e, t) => !!e && W(e) && e.moodEnd > 1e-6 && H(e) && H(t) && (!t.explicitMood || B(t.state.mood ?? 24) > 1e-6);
	e.forEach((e, t) => {
		e.placements.forEach((e) => {
			let n = i(t, e).placement, a = l(n, e), o = r(t, e), s = o.placement, d = u(s, e), f = c.get(e.name);
			e.moodStart = e.fiammettaForced ? 24 : e.explicitMood ? B(e.state.mood ?? 24) : f === void 0 ? a ? n.moodEnd : 24 : f, e.working = !0, e.workHoursBefore = d ? s.workHoursBefore + (o.context?.durationHours ?? 0) : 0, e.moodEnd = e.moodStart;
		});
	});
	for (let n = 0; n < 16; n += 1) {
		let a = 0, o = 0;
		if (e.forEach((e, n) => {
			e.placements.forEach((e) => {
				let t = i(n, e).placement, o = l(t, e), s = r(n, e), d = s.placement, f = u(d, e), p = c.get(e.name), m = e.fiammettaForced ? 24 : e.explicitMood ? B(e.state.mood ?? 24) : p === void 0 ? o ? t.moodEnd : 24 : p;
				a = Math.max(a, Math.abs(m - e.moodStart)), e.moodStart = m, e.working = !0, e.workHoursBefore = f ? d.workHoursBefore + (s.context?.durationHours ?? 0) : 0;
			});
			let s = {
				capBoosts: {},
				bonusByFacility: {}
			};
			e.active = tn(e, t, !0);
			let d = un(e, e.active, t, s);
			e.basePoints = d.points, e.basePointDetails = d.details, e.statValues = dn(e, e.active, t), e.active = tn(e, t, !1);
			let f = un(e, e.active, t, s);
			e.basePoints = f.points, e.basePointDetails = f.details, e.placements.forEach((n) => {
				let r = fn(e, n, t, s);
				n.costRate = r.rate, n.moodRateDetails = r.details;
				let i = H(n) ? B(n.moodStart - n.costRate * e.durationHours) : n.moodStart;
				o = Math.max(o, Math.abs(i - n.moodEnd)), n.moodEnd = i;
			});
		}), n === 7 && s.size > 0 && (s.forEach((t) => {
			let n = e.reduce((e, n) => e + (n.placements.find((e) => e.name === t)?.costRate ?? 0) * n.durationHours, 0);
			c.set(t, n < -1e-6 ? 24 : 0);
		}), a = Infinity), a <= 1e-6 && o <= 1e-6 && (s.size === 0 || c.size === s.size)) break;
	}
	e.forEach((e, n) => {
		e.moodWarnings = e.placements.flatMap((e) => {
			if (!e.explicitMood) return [];
			let r = i(n, e).placement, a = B(e.state.mood ?? 24);
			return !r || !U(r, t) || !U(e, t) || r.moodEnd >= a ? [] : [{
				operator: e.name,
				facility: e.facility.type,
				facilityId: e.facility.id,
				facilityIndex: e.facility.index,
				slotIndex: e.index,
				previousEnd: r.moodEnd,
				configuredStart: a
			}];
		});
	});
	let d = bn(e, t);
	return En(e, t), d;
}
function Y(e, t, n = N) {
	return !e.recipe || !t.product ? !e.recipe : P(t.product, t.sourceMaterial, n)?.recipe === e.recipe;
}
function On() {
	return {
		capBoosts: {},
		bonusByFacility: {}
	};
}
function kn(e, t, n, r, i) {
	return Rt(e) ? qt(e, t, n, r, i, n.durationHours) : J(e, t, n, r, i);
}
function An(e, t, n, r) {
	let i = On(), a = V(e.document, e.index, t), o = t.type === "trading" ? e.ruleset.tradeOrderLimitByLevel[t.level] ?? 0 : 0, s = t.type === "manufacture" ? e.ruleset.manufactureStorageByLevel[t.level] ?? 0 : 0, c = {
		orderLimit: 0,
		storageCap: 0
	}, l = {
		orderLimit: {},
		storageCap: {}
	}, u = X(e, t);
	r.filter((e) => e.target?.id === t.id && R.has(e.effect.stat)).filter((e) => !u.has(e.skill)).filter((e) => e.effect.per?.source !== "stat" && e.effect.per?.source !== "facCap" && e.effect.per?.source !== "capTier").filter((t) => Y(t.effect, a, e.ruleset)).forEach((r) => {
		let a = kn(r, t, e, n, i);
		c[r.effect.stat] = (c[r.effect.stat] ?? 0) + a;
		let o = l[r.effect.stat] ?? (l[r.effect.stat] = {});
		o[r.owner.name] = (o[r.owner.name] ?? 0) + a;
	});
	let d = {
		capBoosts: l,
		bonusByFacility: {}
	};
	r.filter((e) => e.target?.id === t.id && R.has(e.effect.stat)).filter((e) => !u.has(e.skill)).filter((e) => ["facCap", "capTier"].includes(e.effect.per?.source ?? "")).filter((t) => Y(t.effect, a, e.ruleset)).forEach((r) => {
		let i = kn(r, t, e, n, d);
		c[r.effect.stat] = (c[r.effect.stat] ?? 0) + i;
		let a = l[r.effect.stat] ?? (l[r.effect.stat] = {});
		a[r.owner.name] = (a[r.owner.name] ?? 0) + i;
	});
	let f = t.type === "trading" && r.some((e) => e.target?.id === t.id && !u.has(e.skill) && e.effect.per?.source === "stat" && e.effect.stat === "orderLimit"), p = {};
	if (t.type === "trading") {
		let e = c.orderLimit ?? 0;
		p.orderLimit = {
			base: o,
			skill: e,
			total: Math.max(1, o + e)
		};
	}
	if (t.type === "manufacture") {
		let e = c.storageCap ?? 0;
		p.storageCap = {
			base: s,
			skill: e,
			total: s + e
		};
	}
	return {
		attributes: p,
		rawOrderLimit: c.orderLimit ?? 0,
		capBoosts: l,
		linked: f,
		orderLimitNet: c.orderLimit ?? 0
	};
}
function jn(e, t) {
	let n = e.active.filter((e) => e.target?.id === t.id && e.effect.stat === "zeroOpBonus"), r = new Set(n.map((e) => e.owner.name));
	return r.size === 0 ? z : {
		operators: new Set(e.active.filter((e) => e.target?.id === t.id && !r.has(e.owner.name)).map((e) => e.owner.name)),
		exceptSources: new Set(n.flatMap((e) => e.effect.except ?? []))
	};
}
function X(e, t) {
	return new Set(e.active.filter((e) => e.target?.id === t.id).flatMap((e) => e.effect.suppresses ?? []));
}
function Mn(e) {
	return e.effect.stack === "max" && Ze.has(e.effect.stat);
}
function Nn(e, t) {
	let n = e.effect.per?.source;
	return Ct(e) || typeof n == "string" && t.has(n);
}
function Pn(e, t) {
	return !t.operators.has(e.owner.name) || Nn(e, t.exceptSources);
}
function Z(e, t, n, r, i, a, o, s = "all", c = "regular") {
	let l = X(e, t), u = (e) => {
		let t = Ct(e);
		return s === "all" || (s === "base" ? t : !t);
	}, d = (e) => c === "stat" ? e.effect.per?.source === "stat" : e.effect.per?.source !== "stat" && e.effect.per?.source !== "orderCount", f = [];
	r.filter((e) => e.target?.id === t.id && o.has(e.effect.stat)).filter(u).filter((n) => Y(n.effect, V(e.document, e.index, t), e.ruleset)).filter((e) => e.effect.stat !== "tradeNetEff").filter(d).filter((e) => !["moodCost", "moodRecover"].includes(e.effect.stat)).filter((e) => e.effect.stack !== "max").filter((e) => !l.has(e.skill)).filter((e) => Pn(e, a)).forEach((r) => f.push({
		item: r,
		value: J(r, t, e, n, i)
	}));
	let p = /* @__PURE__ */ new Map();
	r.filter((e) => e.target?.id === t.id && o.has(e.effect.stat)).filter(u).filter((n) => Y(n.effect, V(e.document, e.index, t), e.ruleset)).filter(d).filter((e) => e.effect.stack === "max").filter((e) => e.effect.stat !== "tradeNetEff").filter((e) => !l.has(e.skill)).filter((e) => Pn(e, a)).forEach((r) => {
		let a = r.effect.maxGroup ?? `${r.effect.target}|${r.effect.stat}|${r.effect.recipe ?? ""}`, o = p.get(a) ?? /* @__PURE__ */ new Map(), s = o.get(r.owner.name) ?? [];
		s.push({
			item: r,
			value: J(r, t, e, n, i)
		}), o.set(r.owner.name, s), p.set(a, o);
	});
	let m = f.reduce((e, t) => e + t.value, 0), h = [...f];
	return p.forEach((e) => {
		let t = "", n = -Infinity;
		e.forEach((e, r) => {
			let i = e.reduce((e, t) => e + t.value, 0);
			i > n && (t = r, n = i);
		}), t && Number.isFinite(n) && (m += n, h.push(...e.get(t) ?? []));
	}), {
		total: m,
		details: h
	};
}
function Fn(e, t, n, r, i) {
	let a = {};
	return e.facilities.forEach((o) => {
		let s = r.get(o.id), c = {
			capBoosts: n.get(o.id)?.capBoosts ?? {},
			bonusByFacility: a,
			...s ? { capacitySegments: s.segments } : {}
		}, l = jn(e, o), u = /* @__PURE__ */ new Set([
			"tradeSpd",
			"manuProd",
			"clueSpeed",
			"hireSpd",
			"droneCharge",
			"abyssalBoost"
		]), d = Z(e, o, t, e.active.filter((e) => e.target?.id === o.id && (i === "targetFacility" || e.owner.facility.id === o.id) && !["facilityCount", "powerCount"].includes(e.effect.per?.source ?? "")), c, l, u, "combination"), f = {};
		function p(e, t) {
			if (e.effect.excludeFromStat) return;
			let n = e.effect.stat === "tradeNetEff" || e.effect.stat === "tradeGapEff" ? "tradeSpd" : e.effect.stat, r = f[e.owner.name] ?? (f[e.owner.name] = {});
			r[n] = (r[n] ?? 0) + t;
		}
		if (d.details.forEach(({ item: e, value: t }) => p(e, t)), i === "targetFacility" && o.type === "trading") {
			let r = n.get(o.id);
			r && Ln(e, o, t, r, e.active, c, l, d.total, 0).details.forEach(({ item: e, value: t }) => p(e, t));
		}
		a[o.id] = f;
	}), a;
}
function In(e, t) {
	let n = /* @__PURE__ */ new Map();
	return e.facilities.forEach((r) => {
		n.set(r.id, An(e, r, t, e.active));
	}), n;
}
function Ln(e, t, n, r, i, a, o, s, c) {
	if (t.type !== "trading") return {
		value: 0,
		orderLimitNet: r.rawOrderLimit,
		details: []
	};
	let l = X(e, t), u = i.filter((e) => e.target?.id === t.id && !l.has(e.skill) && e.effect.stat === "orderLimit" && e.effect.per?.source === "stat"), d = i.filter((e) => e.target?.id === t.id && e.effect.stat === "tradeNetEff").filter((e) => !l.has(e.skill)).filter((e) => Pn(e, o)), f = i.filter((e) => e.target?.id === t.id && !l.has(e.skill) && e.effect.stat === "tradeSpd" && e.effect.per?.source === "orderCount").filter((e) => Pn(e, o)), p = i.filter((e) => e.target?.id === t.id && !l.has(e.skill) && e.effect.stat === "tradeGapEff").filter((e) => Pn(e, o)), m = e.ruleset.tradeOrderLimitByLevel[t.level] ?? 0;
	if (u.length === 0 && d.length === 0 && f.length === 0 && p.length === 0) return {
		value: 0,
		orderLimitNet: r.rawOrderLimit,
		details: []
	};
	let h = u.reduce((e, t) => {
		let n = t.effect.per, r = Number(n?.per ?? 10), i = Math.abs(Number(n?.value ?? 1));
		return e + Math.floor(Math.max(0, s) / r) * i;
	}, 0), g = u.length > 0 ? r.rawOrderLimit - h : r.rawOrderLimit, _ = [], v = 0;
	if (d.forEach((r) => {
		let i = J(r, t, e, n, {
			...a,
			capBoosts: {
				...a.capBoosts,
				orderLimit: { linked: g }
			}
		});
		v += i, _.push({
			item: r,
			value: i
		});
	}), f.forEach((e) => {
		let t = Number(e.effect.per?.value ?? e.effect.value ?? 0), n = m * t;
		v += n, _.push({
			item: e,
			value: n
		});
	}), p.length > 0) {
		let a = f.length > 0 ? g : Math.max(1, m + r.rawOrderLimit), o = p.map((e) => a * Number(e.effect.value ?? 0)), s = o.reduce((e, t) => e + t, 0), l = c + v + s, u = e.settings.preferMaxJieEfficiency !== !1, d = (u ? void 0 : Hn(e, t, 100, n, i))?.orders ?? [], h = d.reduce((e, t) => e + t.probability * t.time, 0), y = d.length === 1 && d[0]?.ignoreEfficiency ? "fixedOrder" : d.length === 0 || h <= 1e-6 ? "missingOrders" : void 0, b = !u && !y && e.durationHours > 1e-6, x = l, S = 0, C = it(e.settings, t.id), w = p.reduce((e, t) => e + Number(t.effect.value ?? 0), 0), T = f.reduce((e, t) => e + Number(t.effect.per?.value ?? t.effect.value ?? 0), 0), E = w - T;
		if (b) {
			let t = 0, n = l, r = 0;
			for (; t < e.durationHours - 1e-6 && n > 1e-6;) {
				let i = S === 0 ? 1 - C : 1, a = h / (n / 100) * i;
				if (a <= 1e-6) {
					S += 1, n -= E;
					continue;
				}
				if (t + a > e.durationHours + 1e-6) break;
				r += n * a, t += a, S += 1, n -= E;
			}
			x = (r + Math.max(0, n) * Math.max(0, e.durationHours - t)) / e.durationHours;
		}
		let ee = b ? x - c - v : s, te = {
			type: "tradeGap",
			mode: b ? "integral" : "max",
			durationHours: e.durationHours,
			gapBase: a,
			gapValue: s,
			initialEfficiency: l,
			averageEfficiency: b ? x : l,
			...b || y ? { expectedOrderHours: h } : {},
			firstItemProgress: C,
			completedOrders: S,
			decrement: E,
			orderIncrement: T,
			...y ? { fallbackReason: y } : {}
		};
		p.forEach((e, t) => {
			let n = o[t] ?? 0, r = Math.abs(s) > 1e-6 ? n / s : 0;
			_.push({
				item: e,
				value: b ? ee * r : n,
				calculation: te
			});
		}), v += b ? ee : s;
	}
	return {
		value: v,
		orderLimitNet: g,
		details: _
	};
}
function Q(e, t, n, r) {
	return e.details.map(({ item: e, value: t, calculation: n }) => ({
		item: e,
		value: t,
		calculation: n ?? $t(e, r)
	})).filter(({ value: e, calculation: t }) => Math.abs(e) > 1e-6 || t !== void 0).map(({ item: e, value: r, calculation: i }) => ({
		operator: e.owner.name,
		skill: e.skill,
		stat: e.effect.stat,
		value: r,
		facility: t,
		ownerFacility: e.owner.facility.type,
		...e.effect.stack === void 0 ? {} : { stack: e.effect.stack },
		category: n,
		...i ? { calculation: i } : {}
	}));
}
function Rn(e, t) {
	if (e.type === "meeting") return W(t) ? 5 : 0;
	if (e.type === "power" || e.type === "hire" || e.type === "trading" || e.type === "manufacture") {
		let n = e.type === "trading" || e.type === "manufacture" ? 1 : 5;
		return W(t) ? n : 0;
	}
	return 0;
}
function zn(e) {
	return He(e.profile?.rarity ?? 0) + Ue(e.state.elite ?? 0);
}
function Bn(e, t, n, r, i, a, o) {
	let s = Ae(e.document, e.index, t.type, t.index), c = {
		capBoosts: r.capBoosts,
		bonusByFacility: i,
		sameFacilityBonusByFacility: a,
		...o ? { capacitySegments: o.segments } : {}
	}, l = jn(e, t), u = Z(e, t, n, e.active, c, z, /* @__PURE__ */ new Set([...L, "facBase"]), "base"), d = Z(e, t, n, e.active, c, l, L, "combination"), f = Z(e, t, n, e.active, c, l, L, "combination", "stat"), p = G(e, t), m = p.reduce((e, n) => e + Rn(t, n), 0), h = ze(t.type, t.level, e.ruleset);
	if (t.type === "meeting") {
		let t = e.facilities.filter((e) => e.type === "dormitory").reduce((e, t) => e + t.level * 1e3, 0);
		h += Ve(t);
	}
	h += u.total;
	let g = t.type === "meeting" ? p.map((e) => ({
		operator: e.name,
		stat: "operatorTraining",
		value: zn(e),
		facility: t.type,
		ownerFacility: e.facility.type,
		category: "combination"
	})).filter((e) => Math.abs(e.value) > F) : [], _ = g.reduce((e, t) => e + t.value, 0), v = Ln(e, t, n, r, e.active, c, l, d.total, h + m + d.total + f.total + _);
	if (t.type === "trading" && r.attributes.orderLimit) {
		let e = r.rawOrderLimit, t = r.linked ? v.orderLimitNet : e;
		r.attributes.orderLimit = {
			base: r.attributes.orderLimit.base,
			skill: t,
			total: Math.max(1, r.attributes.orderLimit.base + t)
		};
	}
	let y = d.total + f.total + v.value + _, b = Q(u, t.type, "base", e), x = [
		...Q(d, t.type, "combination", e),
		...Q(f, t.type, "combination", e),
		...Q(v, t.type, "combination", e),
		...g
	], S = y, C = [...b, ...x], w = t.type === "meeting" ? on(e, t) : [], T = {
		facility: t,
		inherited: s.inherited,
		inheritedFromPlanIndex: s.sourcePlanIndex,
		baseEfficiency: h,
		moodEfficiency: m,
		operatorEfficiency: m,
		skillEfficiency: y,
		operatorSkillEfficiency: S,
		efficiency: h + m + y,
		attributes: r.attributes,
		...w.length > 0 ? { cluePreferences: w } : {},
		details: C,
		baseDetails: b,
		combinationDetails: x
	}, E = Un(e, t, T.efficiency, n, e.active);
	return T.capacity = Yn(e, t, r, n, e.active)?.capacity, T.production = Xn(e, t, E, T.capacity), T.production && w.length > 0 && (T.production.cluePreferences = w), T;
}
function Vn(e, t) {
	return e.filter((e) => e.target?.id === t.id && e.effect.stat === "tradeOrder").map((e) => e.effect);
}
function Hn(e, t, n, r, i) {
	let a = St(r), o = j(V(e.document, e.index, t).product ?? "龙门币");
	if (o === "合成玉") {
		let e = n / 100, t = a.orundumTradeOrder.productAmount / a.orundumTradeOrder.hours, r = { 源石碎片: -a.orundumTradeOrder.materialAmount / a.orundumTradeOrder.hours };
		return {
			product: o,
			baseAmountPerHour: t,
			baseAmountPerDay: t * 24,
			baseMaterialPerHour: r,
			amountPerHour: t * e,
			amountPerDay: t * e * 24,
			itemRate: e / a.orundumTradeOrder.hours,
			orderRule: "开采协力",
			orders: [{
				name: "源石订单",
				probability: 1,
				quantity: a.orundumTradeOrder.productAmount,
				time: a.orundumTradeOrder.hours,
				material: "源石碎片",
				amount: a.orundumTradeOrder.materialAmount
			}],
			materialPerHour: Object.fromEntries(Object.entries(r).map(([t, n]) => [t, n * e]))
		};
	}
	let s = Vn(i, t), c = s.filter((e) => e.order?.type === "fixed").sort((e, t) => Number(e.order?.priority ?? 99) - Number(t.order?.priority ?? 99))[0], l = n / 100;
	if (c?.order) {
		let e = Number(c.order.qty ?? 0) / Number(c.order.time ?? 1), t = e * (c.order.ignoreEff ? 1 : l), n = c.order.material ? j(c.order.material) : null, r = {}, i = {};
		if (n && c.order.amount) {
			let e = Number(c.order.amount) / Number(c.order.time ?? 1);
			r[n] = -e, i[n] = -e * (c.order.ignoreEff ? 1 : l);
		}
		return {
			product: "龙门币",
			baseAmountPerHour: e,
			baseAmountPerDay: e * 24,
			baseMaterialPerHour: r,
			amountPerHour: t,
			amountPerDay: t * 24,
			itemRate: (c.order.ignoreEff ? 1 : l) / Number(c.order.time ?? 1),
			orderRule: `固定订单：${c.order.orderName ?? "特殊订单"}`,
			orders: [{
				name: c.order.orderName ?? "特殊订单",
				probability: 1,
				quantity: Number(c.order.qty ?? 0),
				time: Number(c.order.time ?? 0),
				material: n,
				amount: Number(c.order.amount ?? 0),
				ignoreEfficiency: c.order.ignoreEff
			}],
			materialPerHour: i
		};
	}
	let u = (a.tradeOrdersByLevel[t.level] ?? a.tradeOrdersByLevel[1] ?? []).map((e) => ({ ...e })), d = s.filter((e) => e.order?.type === "tailor" && e.order.level === "α").length, f = s.filter((e) => e.order?.type === "tailor" && e.order.level === "β").length, p = d === 1 && f === 0 ? "1α" : d === 2 && f === 0 ? "2α" : d === 1 && f === 1 ? "1α1β" : "";
	if (t.level === 3 && p) {
		let e = a.tailorProbabilities[p];
		u.forEach((t, n) => {
			t.probability = e?.[n] ?? t.probability;
		});
	}
	let m = s.find((e) => e.order?.type === "fixValues")?.order, h = m ? [] : s.filter((e) => e.order?.type === "breach"), g = m ? [] : s.filter((e) => e.order?.type === "invest"), _ = h.reduce((e, t) => e + Number(t.order?.amount ?? 0), 0), v = h.reduce((e, t) => e + Number(t.order?.qty ?? 0), 0), y = g.reduce((e, t) => e + Number(t.order?.qty ?? 0), 0), b = 0, x = 0, S = 0, C = [];
	if (u.forEach((e) => {
		let t = h.length > 0 && [2, 3].includes(e.amount), n = m?.qty === void 0 ? Number(e.gold) + (t ? v : 0) + (e.amount === 4 ? y : 0) : Number(m.qty), r = m?.amount === void 0 ? e.amount + (t ? _ : 0) : Number(m.amount), i = [];
		m?.qty !== void 0 && i.push("金额替换"), t && (_ !== 0 || v !== 0) && i.push("违约索赔"), e.amount === 4 && y > 0 && i.push("投资"), b += e.probability * n, x += e.probability * e.hours, S += e.probability * r, C.push({
			name: e.name,
			probability: e.probability,
			quantity: n,
			time: e.hours,
			material: "赤金",
			amount: r,
			...i.length ? { note: i.join("、") } : {}
		});
	}), x <= 1e-6) return;
	let w = b / x, T = { 赤金: -(S / x) }, E = w * l;
	return {
		product: "龙门币",
		baseAmountPerHour: w,
		baseAmountPerDay: w * 24,
		baseMaterialPerHour: T,
		amountPerHour: E,
		amountPerDay: E * 24,
		itemRate: l / x,
		orderRule: m || h.length || g.length || p ? "龙门商法（含特殊规则）" : "龙门商法",
		orders: C,
		materialPerHour: Object.fromEntries(Object.entries(T).map(([e, t]) => [e, t * l]))
	};
}
function Un(e, t, n, r, i) {
	let a = V(e.document, e.index, t);
	if (t.type === "trading") return Hn(e, t, n, r, i);
	if (t.type === "manufacture") {
		let t = P(a.product, a.sourceMaterial, e.ruleset);
		if (!t) return;
		let r = n / 100, i = t.amount / t.hours, o = Object.fromEntries(Object.entries(t.materials ?? {}).map(([e, n]) => [e, -n / t.hours]));
		return {
			product: t.product,
			baseAmountPerHour: i,
			baseAmountPerDay: i * 24,
			baseMaterialPerHour: o,
			amountPerHour: i * r,
			amountPerDay: i * r * 24,
			itemRate: i * r,
			materialPerHour: Object.fromEntries(Object.entries(o).map(([e, t]) => [e, t * r]))
		};
	}
	if (t.type === "meeting") {
		let t = e.ruleset.clueOutputPerHour, r = t * n / 100;
		return {
			product: "线索",
			conversion: {
				label: "信用",
				amountPerUnit: e.ruleset.creditPerClue,
				sourceUnit: "线索",
				baseCycleHours: e.ruleset.clueBaseTimeHours
			},
			baseAmountPerHour: t,
			baseAmountPerDay: t * 24,
			amountPerHour: r,
			amountPerDay: r * 24,
			itemRate: r
		};
	}
	if (t.type === "hire") {
		let t = e.ruleset.hireOutputPerHour, r = t * n / 100;
		return {
			product: "公开招募标签刷新次数",
			baseAmountPerHour: t,
			baseAmountPerDay: t * 24,
			amountPerHour: r,
			amountPerDay: r * 24,
			itemRate: r
		};
	}
}
function Wn(e, t) {
	return [.../* @__PURE__ */ new Set([...Object.keys(e), ...Object.keys(t)])].every((n) => {
		let r = e[n] ?? {}, i = t[n] ?? {};
		return [.../* @__PURE__ */ new Set([...Object.keys(r), ...Object.keys(i)])].every((e) => Math.abs((r[e] ?? 0) - (i[e] ?? 0)) <= F);
	});
}
function Gn(e) {
	return Object.fromEntries(Object.entries(e).map(([e, t]) => [e, { ...t }]));
}
function Kn(e) {
	return e.map((e) => ({
		startHours: e.startHours,
		endHours: e.endHours,
		base: e.base,
		skill: e.skill,
		total: e.total
	}));
}
function qn(e, t, n, r, i, a) {
	let o = V(e.document, e.index, t), s = {
		capBoosts: n.capBoosts,
		bonusByFacility: {}
	}, c = X(e, t), l = {};
	return {
		skill: r.filter((e) => e.target?.id === t.id && R.has(e.effect.stat)).filter((e) => !c.has(e.skill)).filter((e) => e.effect.per?.source !== "stat").filter((t) => Y(t.effect, o, e.ruleset)).reduce((n, r) => {
			let o = Rt(r) ? qt(r, t, e, i, s, a) : J(r, t, e, i, s), c = l[r.effect.stat] ?? (l[r.effect.stat] = {});
			return c[r.owner.name] = (c[r.owner.name] ?? 0) + o, n + o;
		}, 0),
		capBoosts: l
	};
}
function Jn(e, t, n, r, i, a, o, s = 0) {
	let c = e.durationHours, l = r.filter((n) => n.target?.id === t.id && R.has(n.effect.stat) && Rt(n) && n.effect.per?.source !== "stat" && !X(e, t).has(n.skill) && Y(n.effect, V(e.document, e.index, t), e.ruleset));
	if (l.length === 0) return [{
		startHours: 0,
		endHours: c,
		base: a,
		skill: o,
		total: Math.max(s, a + o),
		capBoosts: Gn(n.capBoosts)
	}];
	let u = [0, c];
	l.forEach((e) => {
		u.push(...Jt(e, c));
	});
	let d = Array.from(new Set(u.map((e) => Math.max(0, Math.min(c, e))).sort((e, t) => e - t))), f = [];
	for (let o = 1; o < d.length; o += 1) {
		let c = d[o - 1] ?? 0, l = d[o] ?? c;
		if (l <= c + 1e-6) continue;
		let u = qn(e, t, n, r, i, (c + l) / 2), p = Math.max(s, a + u.skill), m = f[f.length - 1];
		if (m && Math.abs(m.total - p) <= 1e-6 && Wn(m.capBoosts, u.capBoosts)) {
			m.endHours = l;
			continue;
		}
		f.push({
			startHours: c,
			endHours: l,
			base: a,
			skill: u.skill,
			total: p,
			capBoosts: u.capBoosts
		});
	}
	return f.length > 0 ? f : [{
		startHours: 0,
		endHours: c,
		base: a,
		skill: o,
		total: Math.max(s, a + o),
		capBoosts: Gn(n.capBoosts)
	}];
}
function Yn(e, t, n, r, i) {
	let a = n.attributes;
	if (t.type === "trading") {
		let o = a.orderLimit;
		if (!o) return;
		let s = Jn(e, t, n, i, r, o.base, o.skill, 1);
		return {
			capacity: {
				label: "订单上限",
				unit: "单",
				base: o.base,
				skill: o.skill,
				total: o.total,
				segments: Kn(s)
			},
			segments: s
		};
	}
	if (t.type === "manufacture") {
		let o = a.storageCap;
		if (!o) return;
		let s = V(e.document, e.index, t), c = P(s.product, s.sourceMaterial, e.ruleset), l = Jn(e, t, n, i, r, o.base, o.skill), u = i.some((n) => n.target?.id === t.id && R.has(n.effect.stat) && Rt(n) && n.effect.per?.source !== "stat" && !X(e, t).has(n.skill) && Y(n.effect, s, e.ruleset)) ? qn(e, t, n, i, r, e.durationHours).skill : o.skill;
		return {
			capacity: {
				label: "仓库容量",
				unit: "格",
				base: o.base,
				skill: u,
				total: o.base + u,
				segments: Kn(l),
				itemVolume: c?.volume
			},
			segments: l
		};
	}
	if (t.type === "power") {
		let t = [{
			startHours: 0,
			endHours: e.durationHours,
			base: e.ruleset.droneLimit,
			skill: 0,
			total: e.ruleset.droneLimit,
			capBoosts: {}
		}];
		return {
			capacity: {
				label: "无人机上限",
				unit: "架",
				base: e.ruleset.droneLimit,
				skill: 0,
				total: e.ruleset.droneLimit,
				segments: Kn(t)
			},
			segments: t
		};
	}
	if (t.type === "meeting") {
		let t = [{
			startHours: 0,
			endHours: e.durationHours,
			base: e.ruleset.clueLimit,
			skill: 0,
			total: e.ruleset.clueLimit,
			capBoosts: {}
		}];
		return {
			capacity: {
				label: "线索上限",
				unit: "条",
				base: e.ruleset.clueLimit,
				skill: 0,
				total: e.ruleset.clueLimit,
				segments: Kn(t)
			},
			segments: t
		};
	}
	if (t.type === "hire") {
		let t = [{
			startHours: 0,
			endHours: e.durationHours,
			base: e.ruleset.hireLimit,
			skill: 0,
			total: e.ruleset.hireLimit,
			capBoosts: {}
		}];
		return {
			capacity: {
				label: "刷新次数上限",
				unit: "次",
				base: e.ruleset.hireLimit,
				skill: 0,
				total: e.ruleset.hireLimit,
				segments: Kn(t)
			},
			segments: t
		};
	}
}
function Xn(e, t, n, r) {
	if (!n) return;
	if (!r || !n.itemRate || n.itemRate <= 1e-6) return n;
	let i = n.itemRate, a = it(e.settings, t.id), o = Infinity;
	if (r.segments.forEach((e) => {
		if (Number.isFinite(o)) return;
		let n = t.type === "manufacture" && r.itemVolume ? Math.floor(e.total / r.itemVolume) : e.total, s = e.startHours, c = Math.max(0, e.endHours - s);
		if (a >= n - 1e-6) {
			o = s;
			return;
		}
		let l = (n - a) / i;
		if (l <= c + 1e-6) {
			o = s + Math.max(0, l);
			return;
		}
		a += i * c;
	}), !Number.isFinite(o)) {
		let n = t.type === "manufacture" && r.itemVolume ? Math.floor(r.total / r.itemVolume) : r.total;
		o = a >= n - 1e-6 ? e.durationHours : e.durationHours + (n - a) / i;
	}
	let s = o <= e.durationHours + F;
	if (!s || e.settings.overflowMode !== "zero") return {
		...n,
		breachTime: o,
		overflowed: s
	};
	let c = Math.max(0, Math.min(e.durationHours, o)), l = e.durationHours > 1e-6 ? c / e.durationHours : 0, u = n.amountPerHour * l, d = Object.fromEntries(Object.entries(n.materialPerHour ?? {}).map(([e, t]) => [e, t * l]));
	return {
		...n,
		effectiveAmountPerHour: u,
		effectiveAmountPerDay: u * 24,
		effectiveMaterialPerHour: d,
		breachTime: o,
		overflowed: s
	};
}
function Zn(e) {
	return [
		e.owner.facility.id,
		e.owner.index,
		e.owner.name,
		e.skill,
		e.effect.stat,
		JSON.stringify(e.effect.per ?? e.effect.value ?? null)
	].join("|");
}
function Qn(e, t, n, r, i) {
	let a = e.facilities.filter((e) => e.type === "power"), o = a[0];
	if (!o || !K(e, "power").length) return;
	let s = K(e, "power").filter((e) => W(e)).length * 5, c = /* @__PURE__ */ new Set(), l = /* @__PURE__ */ new Set(), u = 0, d = 0, f = [], p = [];
	a.forEach((a) => {
		let o = {
			capBoosts: n.get(a.id)?.capBoosts ?? {},
			bonusByFacility: r,
			sameFacilityBonusByFacility: i
		}, s = Z(e, a, t, e.active, o, z, /* @__PURE__ */ new Set(["droneCharge", "abyssalBoost"]), "combination"), m = Z(e, a, t, e.active, o, z, /* @__PURE__ */ new Set([
			"droneCharge",
			"abyssalBoost",
			"facBase"
		]), "base");
		s.details.forEach(({ item: t, value: n }) => {
			let r = Zn(t);
			c.has(r) || (c.add(r), u += n, f.push(...Q({ details: [{
				item: t,
				value: n
			}] }, a.type, "combination", e)));
		}), m.details.forEach(({ item: t, value: n }) => {
			let r = Zn(t);
			l.has(r) || (l.add(r), d += n, p.push(...Q({ details: [{
				item: t,
				value: n
			}] }, a.type, "base", e)));
		});
	});
	let m = 100 + d, h = u, g = m + s + u, _ = {
		product: "无人机",
		baseAmountPerHour: e.ruleset.powerOutputPerHour,
		baseAmountPerDay: e.ruleset.powerOutputPerHour * 24,
		amountPerHour: e.ruleset.powerOutputPerHour * g / 100,
		amountPerDay: e.ruleset.powerOutputPerHour * g / 100 * 24,
		itemRate: e.ruleset.powerOutputPerHour * g / 100
	}, v = {
		label: "无人机上限",
		unit: "架",
		base: e.ruleset.droneLimit,
		skill: 0,
		total: e.ruleset.droneLimit,
		segments: [{
			startHours: 0,
			endHours: e.durationHours,
			base: e.ruleset.droneLimit,
			skill: 0,
			total: e.ruleset.droneLimit
		}]
	}, y = Xn(e, o, _, v);
	return {
		facility: o,
		baseEfficiency: m,
		moodEfficiency: s,
		operatorEfficiency: s,
		skillEfficiency: u,
		operatorSkillEfficiency: h,
		efficiency: g,
		attributes: {},
		production: y,
		capacity: v,
		details: [...f, ...p],
		baseDetails: p,
		combinationDetails: f
	};
}
function $n(e, t) {
	let n = In(e, t), r = /* @__PURE__ */ new Map();
	e.facilities.forEach((i) => {
		let a = Yn(e, i, n.get(i.id) ?? {
			attributes: {},
			rawOrderLimit: 0,
			capBoosts: {},
			linked: !1,
			orderLimitNet: 0
		}, t, e.active);
		a && r.set(i.id, a);
	});
	let i = Fn(e, t, n, r, "targetFacility"), a = Fn(e, t, n, r, "sameFacility"), o = [], s = Qn(e, t, n, i, a);
	return e.facilities.forEach((c) => {
		if (c.type === "control" || c.type === "processing" || c.type === "training" || c.type === "dormitory") return;
		if (c.type === "power") {
			c.index === 0 && s && o.push(s);
			return;
		}
		if (!G(e, c).length) return;
		let l = n.get(c.id) ?? {
			attributes: {},
			rawOrderLimit: 0,
			capBoosts: {},
			linked: !1,
			orderLimitNet: 0
		};
		o.push(Bn(e, c, t, l, i, a, r.get(c.id)));
	}), {
		name: e.plan.name ?? `队列${e.index + 1}`,
		durationHours: e.durationHours,
		facilities: o,
		moods: e.placements.filter((e) => U(e, t)).map((e) => ({
			operator: e.name,
			facility: e.facility.type,
			facilityId: e.facility.id,
			facilityIndex: e.facility.index,
			slotIndex: e.index,
			start: e.moodStart,
			end: e.moodEnd,
			costRate: e.costRate,
			working: W(e),
			rateDetails: e.moodRateDetails
		})),
		moodWarnings: e.moodWarnings,
		autoRestWarnings: e.autoRestWarnings,
		fiammetta: e.fiammetta,
		fiammettaWarnings: e.fiammettaWarnings,
		basePoints: e.basePoints,
		basePointDetails: e.basePointDetails,
		warnings: e.warnings,
		droneAccelerations: []
	};
}
function er(e, t, n) {
	let r = [], i = [];
	return e.plans.forEach((a, o) => {
		let s = a.drones;
		if (!s || s.enable === !1) return;
		let c = s.room, l = s.index, u = c !== void 0 && l !== void 0 ? n.find((e) => e.type === c && e.index === l) : void 0;
		if (!u || !t[o]) {
			r.push(`${a.name || `队列${o + 1}`}：无人机目标设施无效，未参与无人机计算`);
			return;
		}
		let d = s.order === "post" ? o : (o - 1 + e.plans.length) % e.plans.length;
		if (!t[d]?.facilities.some((e) => e.facility.id === u.id && e.production)) {
			r.push(`${a.name || `队列${o + 1}`}：无人机目标设施没有有效产出，未参与无人机计算`);
			return;
		}
		i.push({
			planIndex: o,
			facility: u,
			order: s.order === "post" ? "post" : "pre",
			sourcePlanIndex: d
		});
	}), {
		targets: i,
		warnings: r
	};
}
function tr(e, t) {
	return e.map((e) => {
		let n = e.facilities.find((e) => e.facility.id === t?.id && e.production)?.production;
		return Math.max(0, (n?.effectiveAmountPerHour ?? n?.amountPerHour ?? 0) * e.durationHours);
	});
}
function nr(e, t, n, r) {
	let { targets: i, warnings: a } = er(e, t, n);
	if (i.length === 0) return a.length > 0 ? {
		enabled: !1,
		details: [],
		warnings: a,
		generatedDrones: 0,
		usedDrones: 0
	} : void 0;
	let o = tr(t, n.find((e) => e.type === "power")), s = [...i].sort((e, t) => e.planIndex - t.planIndex), c = /* @__PURE__ */ new Map(), l = /* @__PURE__ */ new Map();
	s.forEach((n, i) => {
		let u = s[(i - 1 + s.length) % s.length], d = 0, f = u.planIndex, p = s.length === 1, m = 0;
		do {
			if (d += o[f] ?? 0, d > r.droneLimit) {
				let n = d - r.droneLimit;
				l.set(f, Math.max(l.get(f) ?? 0, n)), a.push(`${t[f]?.name || `队列${f + 1}`}：无人机库存 ${d.toFixed(2)} 架，超过 ${r.droneLimit} 架上限`), e.settings?.droneOverflowMode === "zero" && (d = r.droneLimit);
			}
			f = (f + 1) % t.length, m += 1;
		} while (p ? m < t.length : f !== n.planIndex);
		c.set(n.planIndex, d);
	});
	let u = [];
	return i.forEach((e) => {
		if (e.facility.type !== "trading" && e.facility.type !== "manufacture") return;
		let n = t[e.sourcePlanIndex];
		if (!n) return;
		let r = n?.facilities.find((t) => t.facility.id === e.facility.id)?.production;
		if (!r) return;
		let i = c.get(e.planIndex) ?? 0, a = i * 3 / 60, o = r.baseAmountPerHour * a, s = Object.fromEntries(Object.entries(r.baseMaterialPerHour ?? r.materialPerHour ?? {}).map(([e, t]) => [e, t * a])), d = {
			planIndex: e.planIndex,
			facilityId: e.facility.id,
			room: e.facility.type,
			facilityIndex: e.facility.index,
			order: e.order,
			sourcePlanIndex: e.sourcePlanIndex,
			sourceDurationHours: n.durationHours,
			product: r.product,
			droneAmount: i,
			acceleratedHours: a,
			baseAmountPerHour: r.baseAmountPerHour,
			baseMaterialPerHour: r.baseMaterialPerHour ?? r.materialPerHour ?? {},
			extraAmount: o,
			extraMaterial: s,
			overflowed: (l.get(e.planIndex) ?? 0) > 0,
			overflowAmount: l.get(e.planIndex) ?? 0
		};
		t[e.planIndex]?.droneAccelerations.push(d), u.push(d);
	}), {
		enabled: !0,
		details: u,
		warnings: a,
		generatedDrones: o.reduce((e, t) => e + t, 0),
		usedDrones: u.reduce((e, t) => e + t.droneAmount, 0)
	};
}
function rr(e, t, n) {
	n <= 1e-6 || t.forEach((t) => {
		let r = e.find((e) => e.product === t.product);
		if (!r) return;
		let i = t.extraAmount / n;
		r.amountPerHour += i, r.amountPerDay = r.amountPerHour * 24, r.effectiveAmountPerHour !== void 0 && (r.effectiveAmountPerHour += i, r.effectiveAmountPerDay = r.effectiveAmountPerHour * 24);
		let a = (e, t) => {
			let r = { ...e ?? {} };
			return Object.entries(t).forEach(([e, t]) => {
				r[e] = (r[e] ?? 0) + t / n;
			}), r;
		};
		r.materialPerHour = a(r.materialPerHour, t.extraMaterial), r.effectiveMaterialPerHour &&= a(r.effectiveMaterialPerHour, t.extraMaterial);
	});
}
function ir(e, t, n = {}) {
	let r = Dt(e, t, n.progressionProfile, n.treatSkillsAsUnlocked, n.dormitoryDefaultIncludesMoodRecovery), i = Dn(r, t), a = r.map((e) => $n(e, t)), o = nr(e, a, Le(e.layout), t.ruleset ?? N), s = a.reduce((e, t) => e + t.durationHours, 0), c = ct(a, s);
	o?.enabled && rr(c, o.details, s);
	let l = ut(e, c, t.ruleset ?? N);
	if (o) {
		let t = l.filter((e) => e.product !== "无人机");
		return {
			document: e,
			plans: a,
			dailyHours: s,
			dailyFacilities: st(a, s),
			dailyProductions: c,
			dailyOutputs: t,
			...i ? { fiammetta: i } : {},
			fiammettaWarnings: a.flatMap((e) => e.fiammettaWarnings),
			warnings: a.flatMap((e) => e.warnings),
			maaDroneAcceleration: o
		};
	}
	return {
		document: e,
		plans: a,
		dailyHours: s,
		dailyFacilities: st(a, s),
		dailyProductions: c,
		dailyOutputs: l,
		...i ? { fiammetta: i } : {},
		fiammettaWarnings: a.flatMap((e) => e.fiammettaWarnings),
		warnings: a.flatMap((e) => e.warnings),
		...o ? { maaDroneAcceleration: o } : {}
	};
}
function ar(e, t) {
	let n = e.settings ?? {}, r = {
		...t.catalog,
		ruleset: t.ruleset ?? t.catalog.ruleset ?? N
	}, i = be(e);
	if (i.errors.length > 0) throw new ge(i.errors);
	return ir(e, r, {
		progressionProfile: n.progressionProfile,
		treatSkillsAsUnlocked: n.treatSkillsAsUnlocked,
		dormitoryDefaultIncludesMoodRecovery: n.dormitoryDefaultIncludesMoodRecovery
	});
}
//#endregion
//#region src/utils/efficiency/drone.ts
var or = [
	"龙门币",
	"合成玉",
	"赤金",
	"中级作战记录",
	"源石碎片"
], sr = {
	1: "1 但书",
	2: "2 但书",
	3: "3 但书 龙舌兰"
};
function cr(e) {
	let t = Math.min(...e.layout.filter((e) => e.type === "trading").map((e) => e.level));
	return Number.isInteger(t) && t >= 1 && t <= 3 ? t : void 0;
}
function lr(e, t, n) {
	let r = j(t);
	e[r] = (e[r] ?? 0) + n;
}
function ur(e, t) {
	if (t.operators[e]) return { name: e };
	let n = e.match(/^(.+)([012])$/), r = n?.[1];
	if (r && t.operators[r]) return {
		name: r,
		state: { elite: Number(n[2]) }
	};
}
function dr(e, t) {
	let n = e.trim();
	if (!n) return {};
	let r = n.split(/\s+/), i = Number(r[0]);
	if (!Number.isInteger(i) || i < 1 || i > 3) return { error: "龙门币策略格式应为“贸易站等级 干员名…”，等级必须是 1 到 3" };
	let a = [], o = {};
	for (let e of r.slice(1)) {
		let n = ur(e, t);
		if (!n) return { error: `找不到干员“${e}”，或练度后缀不是 0、1、2` };
		if (a.includes(n.name)) return { error: `干员“${n.name}”重复输入` };
		a.push(n.name), n.state && (o[n.name] = n.state);
	}
	return a.length > i ? { error: `等级 ${i} 的贸易站最多输入 ${i} 名干员` } : { strategy: {
		level: i,
		operators: a,
		operatorStates: o
	} };
}
function fr(e) {
	return or.includes(e);
}
function pr(e) {
	let t = e.baseAmountPerHour;
	if (t <= 0) return;
	let n = e.baseMaterialPerHour ?? {};
	return {
		amountPerHour: t,
		materialPerHour: Object.fromEntries(Object.entries(n).map(([e, t]) => [j(e), t]))
	};
}
function mr(e, t) {
	return e === "trading" ? j(t.product ?? "龙门币") : t.product ? j(t.product) : void 0;
}
function hr(e, t, n, r) {
	let i = r.ruleset ?? N, a = mr(e, t);
	if (e === "trading" && a === "龙门币") return _r((i.tradeOrdersByLevel[n] ?? i.tradeOrdersByLevel[1] ?? []).map((e) => ({
		probability: e.probability,
		quantity: e.gold,
		time: e.hours,
		material: "赤金",
		amount: e.amount
	})));
	if (e === "trading" && a === "合成玉") return {
		amountPerHour: i.orundumTradeOrder.productAmount / i.orundumTradeOrder.hours,
		materialPerHour: { 源石碎片: -i.orundumTradeOrder.materialAmount / i.orundumTradeOrder.hours }
	};
	if (e !== "manufacture") return;
	let o = P(a, t.sourceMaterial, i);
	if (o) return {
		amountPerHour: o.amount / o.hours,
		materialPerHour: Object.fromEntries(Object.entries(o.materials ?? {}).map(([e, t]) => [j(e), -t / o.hours]))
	};
}
function gr(e, t, n) {
	return Le(e.layout).filter((e) => e.type === "trading" || e.type === "manufacture").flatMap((r) => e.plans.flatMap((i, a) => {
		let o = Ae(e, a, r.type, r.index).assignment, s = mr(r.type, o);
		if (!s || !fr(s)) return [];
		let c = t.plans[a]?.facilities.find((e) => e.facility.id === r.id), l = c?.production ? pr(c.production) : hr(r.type, o, r.level, n);
		if (!l) return [];
		let u = t.plans[a]?.name ?? i.name;
		return [{
			...l,
			key: `${a}-${r.id}`,
			product: s,
			sourceLabel: `${u || `队列${a + 1}`} · ${A[r.type]}${r.index + 1}`
		}];
	}));
}
function _r(e) {
	let t = e.reduce((e, t) => e + t.probability * t.time, 0);
	if (t <= 0) return;
	let n = e.reduce((e, t) => e + t.probability * t.quantity, 0), r = e.reduce((e, t) => e + (j(t.material ?? "") === "赤金" ? t.probability * (t.amount ?? 0) : 0), 0);
	return {
		amountPerHour: n / t,
		materialPerHour: { 赤金: -r / t }
	};
}
function vr(e, t) {
	let n = t.ruleset ?? N;
	if (e.operators.length === 0) return _r((n.tradeOrdersByLevel[e.level] ?? n.tradeOrdersByLevel[1] ?? []).map((e) => ({
		probability: e.probability,
		quantity: e.gold,
		time: e.hours,
		material: "赤金",
		amount: e.amount
	})));
	let r = ar({
		layout: [{
			type: "control",
			level: 5
		}, {
			type: "trading",
			level: e.level
		}],
		plans: [{
			duration: 1440,
			rooms: {
				control: [{}],
				trading: [{
					product: "龙门币",
					operators: e.operators,
					operatorStates: e.operatorStates
				}]
			}
		}],
		settings: { preferMaxJieEfficiency: !0 }
	}, { catalog: t }).plans[0]?.facilities.find((e) => e.facility.type === "trading")?.production;
	return r ? yr(r) : void 0;
}
function yr(e) {
	return _r(e.orders ?? []);
}
function br(e, t, n) {
	Object.entries(t).forEach(([t, r]) => {
		lr(e, t, r * n);
	});
}
function xr(e, t, n, r = {}) {
	let i = r.ruleset ? {
		...t,
		ruleset: r.ruleset
	} : t, a = Math.max(0, n.无人机 ?? 0), o = a * 3 / 60, s = e.settings?.lmdDroneStrategy?.trim(), c = cr(e), l = r.lmdDroneStrategies ?? sr, u = dr(s || (c ? l[c] ?? "" : ""), i);
	!s && c !== void 0 && u.strategy && u.strategy.level !== c && (u = { error: `${c}级贸易站策略必须以“${c}”开头` });
	let d = gr(e, r.efficiencyResult ?? ar(e, { catalog: i }), i), f = d.some((e) => e.product === "龙门币") && u.strategy ? vr(u.strategy, i) : void 0, p = or.flatMap((e) => {
		if (e === "龙门币") {
			let t = u.strategy;
			return !f || !t ? [] : [Sr("龙门币策略", e, f, a, o)];
		}
		let t = d.find((t) => t.product === e);
		return t ? [Sr(t.key, t.product, t, a, o, t.sourceLabel)] : [];
	});
	return {
		dailyDrones: a,
		acceleratedHours: o,
		...u.error ? { strategyError: u.error } : {},
		scenarios: p
	};
}
function Sr(e, t, n, r, i, a) {
	let o = { 无人机: -r };
	return lr(o, t, n.amountPerHour * i), br(o, n.materialPerHour, i), {
		key: e,
		product: t,
		...a ? { sourceLabel: a } : {},
		baseAmountPerHour: n.amountPerHour,
		baseMaterialPerHour: n.materialPerHour,
		droneAmount: r,
		acceleratedHours: i,
		extraFlow: o
	};
}
//#endregion
//#region src/utils/presentation.ts
function Cr(e) {
	let t = Number(e.duration ?? 720);
	return Math.round(t / 60 * 100) / 100;
}
function $(e, t = 2) {
	return e.toLocaleString("zh-CN", {
		maximumFractionDigits: t,
		useGrouping: !1
	});
}
function wr(e) {
	return e < 0 ? `-${$(Math.abs(e))}` : $(e);
}
function Tr(e) {
	return `${e >= 0 ? "+" : ""}${$(e)}`;
}
function Er(e) {
	let t = e.calculation;
	if (!t) return [];
	if (t.type === "tradeGap") {
		let e = [`模式：${t.mode === "max" ? "最大效率" : "积分平均"}`, `差值基数：${$(t.gapBase)} × ${$(t.gapValue / Math.max(t.gapBase, 1))}% = ${$(t.gapValue)}%`];
		return t.mode === "integral" && e.push(`期望单耗时：${$(t.expectedOrderHours ?? 0)} 小时，首件进度：${$(t.firstItemProgress * 100)}%`, `完成订单：${$(t.completedOrders)}，每单净变化：${Tr(-t.decrement)}%${t.orderIncrement > 0 ? `（订单效率补偿 ${Tr(t.orderIncrement)}%）` : ""}`, `整站效率平均：${$(t.averageEfficiency)}%（初始 ${$(t.initialEfficiency)}%）`), t.fallbackReason && e.push(t.fallbackReason === "fixedOrder" ? "固定订单不参与逐单衰减，按最大效率计算" : "没有可用的订单分布，按最大效率计算"), e;
	}
	if (t.type === "workHours") {
		let n = t.durationHours > 0 ? `效率：${$(t.baseValue)}% × ${$(t.activeHours)} ÷ ${$(t.durationHours)} = ${$(e.value)}%` : "效率：队列时长为 0，结果为 0%";
		return [
			`累计工作时长：${$(t.beforeHours)} + ${$(t.durationHours)} = ${$(t.beforeHours + t.durationHours)} 小时（阈值 ${$(t.threshold)} 小时）`,
			`生效时长：max(0, min(${$(t.durationHours)}, ${$(t.beforeHours)} + ${$(t.durationHours)} - ${$(t.threshold)})) = ${$(t.activeHours)} 小时`,
			n
		];
	}
	let n = t.steps.findIndex((e) => e.value >= t.cap), r = n >= 0 ? t.steps.slice(0, n) : t.steps, i = n >= 0 ? t.steps.slice(n).reduce((e, t) => e + t.weight, 0) : 0, a = [...r.map((e) => `${$(e.value)} × ${$(e.weight)}`), ...n >= 0 ? [`${$(t.cap)} × ${$(i)}`] : []].join(" + "), o = t.steps.reduce((e, t) => e + t.value * t.weight, 0), s = t.durationHours > 0 ? o / t.durationHours : 0, c = [
		`累计工作时长：${$(t.beforeHours)} + ${$(t.durationHours)} = ${$(t.beforeHours + t.durationHours)} 小时`,
		`档位公式：min(${$(t.startValue)} + (累计时长 + h - ${$(t.startHours)}) × ${$(t.step)}, ${$(t.cap)})`,
		t.durationHours > 0 ? `加权平均：(${a || "0"}) ÷ ${$(t.durationHours)} = ${$(e.value)}%` : "加权平均：队列时长为 0，结果为 0%"
	];
	if (t.workHours) {
		let n = t.durationHours > 0 ? `效率：${$(s)}% × ${$(t.workHours.activeHours)} ÷ ${$(t.durationHours)} = ${$(e.value)}%` : "效率：队列时长为 0，结果为 0%";
		c.push(`工作时长条件：生效 ${$(t.workHours.activeHours)} 小时 / ${$(t.durationHours)} 小时`, n);
	}
	return c;
}
function Dr(e) {
	return Er(e).map((e) => {
		let t = e.indexOf("：");
		return t < 0 ? { value: e } : {
			label: e.slice(0, t + 1),
			value: e.slice(t + 1).trimStart()
		};
	});
}
function Or(e) {
	return $(e);
}
var kr = {
	...Ce,
	线索: "线索",
	无人机: "无人机",
	信用: "信用",
	公开招募标签刷新次数: "公开招募标签刷新次数",
	固源岩: "固源岩",
	装置: "装置"
};
function Ar(e) {
	let t = j(e);
	return kr[t] ?? t;
}
function jr(e) {
	return Ar(e);
}
function Mr(e) {
	return e?.length ? `更容易获得${e.map((e) => typeof e == "number" ? `线索${e}` : e === "unowned" ? "尚未拥有的线索" : "已经拥有的线索").join("、")}` : "";
}
function Nr(e, t) {
	return t * (e.conversion?.amountPerUnit ?? 1);
}
function Pr(e) {
	return e.kind === "base" ? "基础消耗速度" : e.kind === "controlWorkers" ? `控制中枢干员减耗（${e.count ?? 0}人）` : e.kind === "facilityWorkers" ? `同设施干员减耗（${e.count ?? 0}人）` : `${[e.operator, e.skill].filter(Boolean).join(" · ") || "技能"}${e.stat === "moodRecover" ? "恢复" : "消耗"}`;
}
function Fr(e) {
	let [t, ...n] = e.rateDetails;
	return t ? `${$(t.value)}${n.map((e) => ` ${e.value >= 0 ? "+" : "-"} ${$(Math.abs(e.value))}`).join("")} = ${$(e.costRate)}/小时` : `0 = ${$(e.costRate)}/小时`;
}
var Ir = {
	tradeSpd: "贸易效率",
	tradeGapEff: "订单差值效率",
	tradeNetEff: "贸易净效率",
	manuProd: "制造效率",
	clueSpeed: "线索速度",
	clueChance: "线索概率",
	hireSpd: "公开招募效率",
	droneCharge: "无人机充能",
	orderLimit: "订单上限",
	storageCap: "仓库容量",
	facBase: "设施基础效率",
	abyssalBoost: "深海效果",
	moodRecover: "心情恢复",
	moodCost: "心情消耗",
	facilityCount: "设施数量",
	basePointGain: "基地点数产出",
	basePointConvert: "基地点数转化",
	tradeOrder: "订单规则",
	zeroOpMood: "干员心情清除",
	zeroOpBonus: "干员效率清除",
	moodSwap: "心情交换",
	skillTagConvert: "技能类别转换",
	operatorTraining: "干员练度效率"
}, Lr = /* @__PURE__ */ new Set([
	"tradeSpd",
	"tradeGapEff",
	"tradeNetEff",
	"manuProd",
	"clueSpeed",
	"clueChance",
	"hireSpd",
	"droneCharge",
	"facBase",
	"abyssalBoost",
	"operatorTraining"
]);
function Rr(e) {
	return Ir[e] ?? "其他效果";
}
function zr(e, t) {
	return `${Tr(t)}${Lr.has(e) ? "%" : ""}`;
}
function Br(e) {
	return Lr.has(e) ? "%" : "";
}
function Vr(e, t = !1) {
	let n = e.baseMaterialPerHour ?? e.materialPerHour ?? {}, r = t ? e.effectiveMaterialPerHour ?? e.materialPerHour ?? {} : e.materialPerHour ?? {};
	return [.../* @__PURE__ */ new Set([...Object.keys(n), ...Object.keys(r)])].map((e) => ({
		material: e,
		amount: r[e] ?? 0,
		baseAmount: n[e] ?? 0
	})).filter(({ amount: e, baseAmount: t }) => Math.abs(e) > 1e-6 || Math.abs(t) > 1e-6);
}
function Hr(e) {
	return `${$(e)} 小时`;
}
function Ur(e) {
	return e.overflowed === void 0 ? "未启用容量模拟" : e.overflowed ? "计划内会爆仓" : "计划内不爆仓";
}
//#endregion
//#region src/utils/resultPresentation.ts
function Wr(e, t) {
	return e.moods.filter((e) => e.working && (e.facilityId === t.facility.id || t.facility.type === "power" && e.facility === "power"));
}
function Gr(e) {
	return e.plans.flatMap((e, t) => {
		let n = e.facilities.filter((e) => e.production !== void 0 || e.capacity !== void 0 || e.details.length > 0).map((n) => ({
			plan: e,
			planIndex: t,
			facility: n,
			moods: Wr(e, n),
			droneAccelerations: e.droneAccelerations.filter((e) => e.facilityId === n.facility.id)
		})), r = e.moods.filter((e) => e.facility === "control" && e.working);
		return r.length > 0 ? [{
			plan: e,
			planIndex: t,
			moods: r
		}, ...n] : n;
	});
}
function Kr(e, t, n = {}) {
	let r = /* @__PURE__ */ new Map();
	return t.forEach((t) => {
		let i = t.facility?.facility.id ?? "control", a = t.facility ? n.facilityLabel?.(t.facility) ?? `${A[t.facility.facility.type]} ${t.facility.facility.index + 1}` : A.control, o = r.get(i);
		o || (o = {
			key: i,
			label: a,
			activeColumnCount: 0,
			columns: e.plans.map((e, t) => ({
				plan: e,
				planIndex: t
			}))
		}, r.set(i, o));
		let s = o.columns[t.planIndex];
		s && (s.step || (o.activeColumnCount += 1), s.step = t);
	}), [...r.values()];
}
function qr(e, t) {
	let n = e.time > 0 ? e.quantity / e.time : 0, r = e.ignoreEfficiency ? 1 : t / 100;
	return {
		name: e.name,
		probability: e.probability,
		baseRate: n,
		totalRate: n * r,
		...e.ignoreEfficiency ? { ignoreEfficiency: !0 } : {}
	};
}
function Jr(e, t, n) {
	let r = e.baseMaterialPerHour ?? e.materialPerHour ?? {}, i = e.effectiveMaterialPerHour ?? e.materialPerHour ?? {};
	return [.../* @__PURE__ */ new Set([...Object.keys(r), ...Object.keys(i)])].map((e) => ({
		material: e,
		baseAmountPerHour: r[e] ?? 0,
		amount: i[e] ?? 0
	})).filter(({ baseAmountPerHour: e, amount: t }) => e < -1e-6 || t < -1e-6).map(({ material: e, baseAmountPerHour: r, amount: i }) => ({
		material: e,
		baseAmountPerHour: r,
		dailyAmount: i * t * 24 / n,
		queueTotal: i * t
	}));
}
function Yr(e, t) {
	t.forEach((t) => {
		let n = e.find((e) => e.material === t.material);
		n ? (n.baseAmountPerHour += t.baseAmountPerHour, n.dailyAmount += t.dailyAmount, n.queueTotal += t.queueTotal) : e.push({ ...t });
	});
}
function Xr(e, t, n = {}) {
	return e.dailyHours <= 0 ? [] : e.plans.map((r, i) => {
		let a = /* @__PURE__ */ new Map(), o = {};
		return r.facilities.forEach((t) => {
			let i = t.production;
			if (!i) return;
			yt(o, i, r.durationHours);
			let s = i.baseAmountPerHour, c = i.amountPerHour, l = i.effectiveAmountPerHour ?? c, u = Jr(i, r.durationHours, e.dailyHours), d = a.get(i.product) ?? {
				product: i.product,
				baseEfficiency: 0,
				totalEfficiency: 0,
				baseOutputPerHour: 0,
				totalOutputPerHour: 0,
				selectedOutputPerHour: 0,
				dailyContribution: 0,
				queueTotal: 0,
				materials: [],
				facilities: []
			};
			Yr(d.materials, u), d.baseEfficiency += t.baseEfficiency, d.totalEfficiency += t.efficiency, d.baseOutputPerHour += s, d.totalOutputPerHour += c, d.selectedOutputPerHour += l, d.queueTotal += l * r.durationHours, d.facilities.push({
				label: n.facilityLabel?.(t) ?? `${A[t.facility.type]} ${t.facility.index + 1}`,
				baseEfficiency: t.baseEfficiency,
				totalEfficiency: t.efficiency,
				baseOutputPerHour: s,
				totalOutputPerHour: c,
				selectedOutputPerHour: l,
				materials: u,
				orders: (i.orders ?? []).map((e) => qr(e, t.efficiency))
			}), a.set(i.product, d);
		}), {
			plan: r,
			planIndex: i,
			products: Array.from(a.values()).map((t) => ({
				...t,
				dailyContribution: t.selectedOutputPerHour * r.durationHours * 24 / e.dailyHours
			})),
			sanity: bt(Object.fromEntries(Object.entries(o).map(([t, n]) => [t, n * 24 / e.dailyHours])), t)
		};
	}).filter((e) => e.products.length > 0);
}
function Zr(e) {
	let t = {};
	e.dailyProductions.forEach((n) => {
		e.maaDroneAcceleration?.enabled && n.product === "无人机" || yt(t, n, 24);
	});
	let n = e.dailyOutputs.find((e) => e.product === "信用");
	return n && (t.信用 = n.amountPerDay), t;
}
function Qr(e) {
	if (e === "赤金") return {
		factor: 500,
		label: "赤金点数"
	};
	if (e === "中级作战记录") return {
		factor: 1e3,
		label: "经验点数"
	};
}
function $r(e, t) {
	return e[t] ?? 0;
}
function ei(e, t, n, r, i) {
	let a = Qr(e), o = n?.items.find((t) => t.resource === e), s = t[e] ?? r ?? 0, c = a?.label ?? o?.amountUnit ?? Ar(e), l = s * (a?.factor ?? 1), u = o?.contribution ?? (n?.complete ? 0 : void 0), d = r === void 0 || !a ? void 0 : r * a.factor;
	return {
		product: e,
		...i === void 0 ? {} : { sourceFacility: i },
		...r === void 0 ? {} : { grossAmount: r },
		...d === void 0 ? {} : { grossPoints: d },
		...a ? { grossPointsLabel: a.label } : {},
		netAmount: l,
		netResourceAmount: s,
		netUnit: c,
		...u === void 0 ? {} : { netContribution: u },
		showNet: r === void 0 || Math.abs(s - r) > 1e-6
	};
}
function ti(e, t, n, r = {}) {
	let i = e.dailyOutputs.filter((e) => e.kind === "production"), a = new Set(i.map((e) => e.product));
	return [...i.map((e) => ei(e.product, t, n, e.amountPerDay, r.sourceFacilityForProduct?.(e.product))), ...e.dailyOutputs.filter((e) => e.kind === "net" && !a.has(e.product)).map((e) => ei(e.product, t, n, void 0, r.sourceFacilityForProduct?.(e.product)))];
}
function ni(e, t) {
	Object.entries(t).forEach(([t, n]) => {
		if (n !== void 0) {
			let r = e;
			r[t] = (r[t] ?? 0) + n;
		}
	});
}
function ri(e, t) {
	let n = { ...t }, r = e.maaDroneAcceleration;
	return !r?.enabled || e.dailyHours <= 0 || r.details.forEach((t) => {
		ni(n, {
			[t.product]: -t.extraAmount * 24 / e.dailyHours,
			...Object.fromEntries(Object.entries(t.extraMaterial).map(([t, n]) => [t, -n * 24 / e.dailyHours]))
		});
	}), n;
}
function ii(e, ...t) {
	let n = /* @__PURE__ */ new Set([e]);
	return t.forEach((e) => {
		Object.entries(e).forEach(([e, t]) => {
			t !== void 0 && Math.abs(t) > 1e-6 && n.add(e);
		});
	}), [...n];
}
function ai(e, t, n, r, i) {
	return r.filter((n) => n !== "无人机" && (n === e || Math.abs($r(t, n)) > 1e-6)).map((r) => ei(r, t, void 0, r === e ? n : void 0, i?.(r)));
}
function oi(e, t, n, r = {}) {
	return e.dailyHours <= 0 ? [] : t.scenarios.map((t) => {
		let i = e.dailyProductions.find((e) => e.product === t.product), a = i ? (i.effectiveAmountPerDay ?? i.amountPerDay) - (e.maaDroneAcceleration?.details.filter((e) => e.product === t.product).reduce((t, n) => t + n.extraAmount * 24 / e.dailyHours, 0) ?? 0) : 0, o = ri(e, n);
		ni(o, t.extraFlow);
		let s = ii(t.product, t.extraFlow), c = $r(t.extraFlow, t.product);
		return {
			scenario: t,
			views: [{
				key: "extra",
				label: "无人机额外产出与消耗",
				cards: ai(t.product, t.extraFlow, c, s, r.sourceFacilityForProduct)
			}, {
				key: "accelerated",
				label: "全部无人机加速后",
				cards: ai(t.product, o, a + c, s, r.sourceFacilityForProduct)
			}]
		};
	});
}
function si(e, t) {
	let n = (e) => e.basePointDetails.filter((e) => !t || t.has(e.term));
	return e.plans.some((e) => n(e).length > 0) ? e.plans.map((e, t) => ({
		plan: e,
		planIndex: t,
		points: n(e)
	})) : [];
}
function ci(e) {
	let t = e.maaDroneAcceleration?.details ?? [];
	return e.plans.map((e, n) => ({
		plan: e,
		planIndex: n,
		details: t.filter((e) => e.planIndex === n)
	}));
}
function li(e, t) {
	let { facility: n } = e;
	if (n.type === "power") return A[n.type];
	let r = t.filter((e) => e.type === n.type).length;
	return `${A[n.type]}${r > 1 ? ` ${n.index + 1}` : ""}`;
}
function ui(e, t) {
	let n = [e.operator, e.skill].filter(Boolean).join(" · "), r = A[e.facility] ?? e.facility;
	return e.kind === "convert" && e.from ? `${n}（${r}，由${t[e.from]?.name ?? e.from} × ${$(e.rate ?? 0)}派生）` : `${n}（${r}）`;
}
function di(e, t) {
	return t[e]?.name ?? e;
}
function fi(e, t) {
	return !e.inherited || e.inheritedFromPlanIndex === void 0 ? "" : `继承自 ${t[e.inheritedFromPlanIndex]?.name || `队列${e.inheritedFromPlanIndex + 1}`}`;
}
function pi(e, t) {
	return e === "信用" ? "meeting" : t.dailyFacilities.find((t) => t.production?.product === e)?.facility.type;
}
function mi(e, t) {
	let n = t.dailyAmounts ?? Zr(e), r = bt(n, t.sanityValues), i = Gr(e), a = {
		sourceFacilityForProduct: t.sourceFacilityForProduct,
		facilityLabel: t.facilityLabel
	};
	return {
		calculationSteps: i,
		calculationStepGroups: Kr(e, i, a),
		dailyOutputQueueDetails: Xr(e, t.sanityValues, a),
		dailySanityAmounts: n,
		dailySanityResult: r,
		dailyOutputCards: ti(e, n, r, a),
		droneScenarioDisplays: t.droneAcceleration ? oi(e, t.droneAcceleration, n, a) : [],
		basePointQueueDetails: si(e, t.visibleBasePointTerms),
		maaDroneQueueDetails: ci(e)
	};
}
//#endregion
//#region src/utils/notices.ts
function hi(e) {
	let t = [], n = e.document, r = n?.layout.reduce((e, t) => {
		let n = De(t.type, t.level);
		return n >= 0 ? e.provided += n : e.used += -n, e.net = e.provided - e.used, e;
	}, {
		used: 0,
		provided: 0,
		net: 0
	}) ?? {
		used: 0,
		provided: 0,
		net: 0
	};
	if (r.net < 0 && t.push({
		code: "negative-power",
		level: "warning",
		message: "电力不足",
		details: [`当前布局提供 ${r.provided} 点电力，消耗 ${r.used} 点电力，净电力 ${r.net} 点`]
	}), e.efficiencyError) return t.push({
		code: "efficiency-data-error",
		level: "error",
		message: "效率数据读取失败",
		details: [e.efficiencyError]
	}), t;
	let i = n ? be(n) : void 0;
	if (i?.errors.length) return t.push({
		code: "schedule-period-error",
		level: "error",
		message: "定时换班时间无效",
		details: i.errors
	}), t;
	i?.warnings.length && t.push({
		code: "schedule-period-gap",
		level: "info",
		message: "定时换班存在时间空档",
		details: i.warnings
	});
	let a = e.result;
	if (!a) return t;
	a.maaDroneAcceleration?.warnings.length && t.push({
		code: "maa-drone-overflow",
		level: "info",
		message: "发现无人机爆仓风险",
		details: a.maaDroneAcceleration.warnings
	}), a.warnings.length > 0 && t.push({
		code: "missing-skill-data",
		level: "error",
		message: "找不到干员技能数据",
		details: a.warnings
	});
	let o = a.plans.flatMap((e, t) => e.moodWarnings.map((n) => `${e.name || `队列${t + 1}`} · ${A[n.facility]} ${n.facilityIndex + 1} · ${n.operator}：上一队列结束心情 ${$(n.previousEnd)}，当前手动设置为 ${$(n.configuredStart)}`));
	o.length > 0 && t.push({
		code: "mood-inheritance",
		level: "warning",
		message: "发现心情继承异常",
		details: o
	});
	let s = a.plans.flatMap((e, t) => e.moods.filter((e) => e.working && e.start > 0 && e.end === 0).map((n) => `${e.name || `队列${t + 1}`} · ${A[n.facility]} ${n.facilityIndex + 1} · ${n.operator}：工作后心情从 ${$(n.start)} 降至 0`));
	s.length > 0 && t.push({
		code: "mood-work-zero",
		level: "warning",
		message: "有干员在工作后心情降至 0",
		details: s
	});
	let c = a.plans.flatMap((e, t) => e.autoRestWarnings.map((n) => {
		let r = n.facilityIndex === void 0 ? "" : ` · 宿舍 ${n.facilityIndex + 1}`, i = n.reason === "no-space" ? `休整前心情 ${$(n.startMood)}` : `休整后心情 ${$(n.endMood)}，低于下次工作预期 ${$(n.expectedMood)}（休整前 ${$(n.startMood)}）`;
		return {
			detail: `${e.name || `队列${t + 1}`} · ${n.operator}${r}：${i}`,
			reason: n.reason
		};
	})), l = c.filter((e) => e.reason === "no-space").map((e) => e.detail);
	l.length > 0 && t.push({
		code: "mood-auto-rest-no-space",
		level: "info",
		message: "宿舍槽位不足，无法自动休整",
		details: l
	});
	let u = c.filter((e) => e.reason === "not-recovered").map((e) => e.detail);
	if (u.length > 0 && t.push({
		code: "mood-auto-rest-not-recovered",
		level: "info",
		message: "自动休整后心情未达到预期",
		details: u
	}), a.fiammettaWarnings.length > 0) {
		let e = a.fiammetta?.mode === "direct";
		t.push({
			code: "fiammetta-mood",
			level: "warning",
			message: e ? "菲亚梅塔无法完全恢复这些干员心情" : "发现菲亚梅塔心情恢复异常",
			details: e ? [] : a.fiammettaWarnings
		});
	}
	let d = a.plans.flatMap((e, t) => e.facilities.flatMap((r) => {
		let i = r.production;
		if (!i?.overflowed || i.breachTime === void 0) return [];
		let a = r.facility.type === "power" ? e.moods.filter((e) => e.facility === "power").map((e) => e.operator) : e.moods.filter((e) => e.facilityId === r.facility.id).map((e) => e.operator), o = i.breachTime <= 0 ? "将立即爆仓" : `将在工作 ${Hr(i.breachTime)}后爆仓`;
		return [`${e.name || `队列${t + 1}`} · ${li(r, n?.layout ?? [])} · ${a.join("、") || "无干员"}：${o}`];
	}));
	return d.length > 0 && t.push({
		code: "overflow-risk",
		level: "info",
		message: "发现爆仓风险",
		details: d
	}), t;
}
function gi(e) {
	let t = e.plans.flatMap((t, n) => xe.flatMap((r) => {
		let i = t.rooms[r];
		if (!Array.isArray(i)) return [];
		let a = e.layout.filter((e) => e.type === r).length;
		return i.slice(a).map((e, i) => ({
			planName: t.name || `队列${n + 1}`,
			type: r,
			index: a + i,
			room: e
		}));
	}));
	if (t.length !== 0) return {
		code: "import-extra-rooms",
		level: "error",
		message: "导入排班表包含未登记设施实例",
		details: t.map((e) => {
			let t = e.room.operators?.filter((e) => !!e), n = t?.length ? `：${t.join("、")}` : "";
			return `${e.planName} · ${A[e.type]} ${e.index + 1}${n}`;
		}),
		closable: !0
	};
}
//#endregion
export { We as BASE_POINT_TERM_KEYS, ft as BATTLE_RECORD_EXPERIENCE, sr as DEFAULT_LMD_DRONE_STRATEGIES, N as DEFAULT_RULESET, mt as DEFAULT_SANITY_SETTINGS, or as DRONE_ACCELERATABLE_PRODUCTS, dt as DRONE_ACCELERATION_MINUTES, F as EPSILON, M as ORUNDUM_TRADE_ORDER, pt as PURE_GOLD_POINTS, ge as SchedulePeriodError, Fe as TRADE_ORDER_LIMIT, yt as addProductionFlow, st as aggregateDaily, ut as aggregateDailyOutputs, ct as aggregateDailyProductions, be as analyzeSchedulePeriods, ri as baseAmountsWithoutMaaDrones, qe as basePointTermOptions, si as buildBasePointQueueDetails, Kr as buildCalculationStepGroups, Gr as buildCalculationSteps, ti as buildDailyOutputCards, Xr as buildDailyOutputQueueDetails, Zr as buildDailySanityAmounts, oi as buildDroneScenarioDisplays, hi as buildEfficiencyNotices, Le as buildFacilities, gi as buildImportedExtraRoomsNotice, ci as buildMaaDroneQueueDetails, mi as buildResultPresentation, xr as calculateDroneAcceleration, ar as calculateEfficiency, bt as calculateSanityResult, _t as calculateSanityValues, re as catalogOperator, B as clampMood, u as cloneProgressionEntries, Mr as cluePreferenceText, Je as compareBasePointDetails, Ye as compareBasePointSources, Ke as compareBasePointTermOptions, Nr as convertedProductionAmount, te as createEfficiencyCatalog, me as createSpecialOperatorAvatarLabelResolver, Be as dormitoryAtmosphere, Rr as efficiencyStatLabel, Br as efficiencyStatUnit, zr as efficiencyStatValue, Ue as eliteEfficiency, S as entryHasNode, C as entryUnlocksFacility, ze as facilityBaseEfficiency, Ie as facilityId, Ur as facilityOverflowLabel, it as firstItemProgress, b as fixedProgressionNodes, di as formatBasePointLabel, ui as formatBasePointSource, Hr as formatDurationHours, wr as formatEfficiencyNumber, li as formatFacilityResultLabel, fi as formatInheritedSourceLabel, $ as formatNumber, Or as formatProduction, O as groupIncludesOperator, ie as groupMembers, nt as hasFlowGoldDisplayOperator, ae as hasGroupMember, _ as highestEliteLevel, fe as isKnownSpecialOperator, ce as isPercentageOperator, D as isSpecialOperator, de as isTermOperator, P as manufactureRule, g as maximumProgressionForFacility, Ve as meetingAtmosphereBonus, Re as meetingBaseEfficiency, h as minimumProgressionForNodes, Pr as moodRateDetailLabel, Fr as moodRateFormula, Wr as moodSnapshotsForFacility, y as nodesForOperator, Er as operatorCalculationLines, Dr as operatorCalculationRows, dr as parseLmdDroneStrategy, l as parseOperatorProgressionImport, se as percentageOperatorValue, Cr as planDurationHoursValue, jr as productionLabel, Vr as productionMaterialsForDisplay, c as progressionEntryFromUnknown, d as progressionNodes, x as progressionNodesForFacility, He as rarityEfficiency, v as resolveOperatorProgression, Ar as resourceLabel, pi as resultPresentationSourceFacility, V as roomAssignments, xt as sanityItemDefinitions, _e as schedulePeriodForRange, k as schedulePeriodMinute, Tr as signedNumber, pe as specialOperatorAvatarLabel, he as specialOperatorTermMembers, rt as stateOf, le as termKeysForSpecialOperator };
