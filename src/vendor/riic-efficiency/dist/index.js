//#region src/utils/operatorProgression.ts
var e = /* @__PURE__ */ new Set(["processing", "training"]);
function t(e) {
	return typeof e == "object" && !!e && !Array.isArray(e);
}
function n(e) {
	return e === 2 ? 2 : +(e === 1);
}
function r(e) {
	return Math.max(1, Math.min(90, Math.round(e)));
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
		level: Math.max(1, s),
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
		level: 1
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
		level: 1
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
function ee(e, t, n) {
	return p(e, d(t).filter((e) => e.facilities.includes(n)));
}
//#endregion
//#region src/types/schedule.ts
var C = [
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
function w(e) {
	return e ? e.split(/\r?\n/).slice(1).join("").split(/[、,，]/).map((e) => e.trim()).filter(Boolean) : [];
}
function T(e) {
	return Object.fromEntries(Object.entries(e).map(([e, t]) => [e, {
		...t,
		members: t.members?.length ? [...t.members] : w(t.definition)
	}]));
}
function te(e) {
	return e ? e.chains.flatMap((e) => e.stages.map((e) => e.name)) : [];
}
function ne(e, t) {
	let n = {};
	return e.forEach((e) => {
		n[e.name] = {
			id: e.id,
			name: e.name,
			maxEliteLevel: re(e.rarity ?? 0),
			rarity: e.rarity ?? 0,
			skillFile: e,
			skillNames: te(e)
		};
	}), {
		operators: n,
		terms: T(t)
	};
}
function re(e) {
	return e >= 4 ? 2 : +(e === 3);
}
function ie(e, t) {
	return e.operators[t];
}
function ae(e, t) {
	return t ? e.terms[t]?.members ?? [] : [];
}
function oe(e, t, n) {
	return ae(e, t).includes(n);
}
//#endregion
//#region src/utils/specialOperators.ts
var se = /^\d+(?:\.\d+)?%$/;
function ce(e) {
	if (se.test(e.trim())) return Number(e.trim().slice(0, -1));
}
function le(e) {
	return ce(e) !== void 0;
}
function ue(e, t) {
	return de(e, t.terms);
}
function de(e, t) {
	let n = e.trim();
	return Object.entries(t).filter(([e, t]) => e === n || t.name === n).map(([e]) => e);
}
function fe(e, t) {
	return ue(e, t).length > 0;
}
function pe(e, t) {
	return le(e) || fe(e, t);
}
function me(e, t = {}) {
	return le(e) || de(e, t).length > 0;
}
function he(e, t) {
	let n = e.trim();
	if (le(n)) return n;
	let r = de(n, t)[0], i = r ? t[r]?.name : void 0;
	if (i) return Array.from(i).slice(0, 2).join("");
}
function ge(e) {
	let t = /* @__PURE__ */ new Map();
	return function(n) {
		return t.has(n) || t.set(n, he(n, e)), t.get(n);
	};
}
function E(e, t, n) {
	return ae(e, t).includes(n) || t !== void 0 && ue(n, e).includes(t);
}
function _e(e, t) {
	let n = ue(e, t);
	return Array.from(new Set(n.flatMap((e) => ae(t, e))));
}
//#endregion
//#region src/utils/schedule.ts
var ve = class extends Error {
	constructor(e) {
		super(e.join("；")), this.name = "SchedulePeriodError";
	}
};
function D(e) {
	if (typeof e != "string" || !/^\d{2}:\d{2}$/.test(e)) return;
	let [t, n] = e.split(":"), r = Number(t), i = Number(n);
	return r <= 23 && i <= 59 ? r * 60 + i : void 0;
}
function ye(e, t) {
	let n = D(e), r = D(t);
	if (n !== void 0 && r !== void 0) return n <= r ? [[e, t]] : [[e, "23:59"], ["00:00", t]];
}
function be(e) {
	let t = Math.max(0, Math.min(1439, e));
	return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}
function xe(e, t) {
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
		let e = D(a[0]), o = D(a[1]);
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
		let n = e[0], r = e[1], i = D(n?.[0]), a = D(n?.[1]), o = D(r?.[0]), s = D(r?.[1]);
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
function Se(e) {
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
		let o = xe(n.period, r);
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
		r > 0 && e.start > s && n.push(`定时换班存在 ${be(s)} 到 ${be(e.start - 1)} 的时间空档`), s = e.end;
	});
	let c = o[0];
	return c && c.start > 0 && n.unshift(`定时换班存在 00:00 到 ${be(c.start - 1)} 的时间空档`), s < 1440 && n.push(`定时换班存在 ${be(s)} 到 23:59 的时间空档`), t.length === 0 && a.length === e.plans.length && r.forEach((t, n) => {
		let i = a[n], o = a[(n + 1) % a.length];
		i !== void 0 && o !== void 0 && (r[n] = a.length === 1 ? i === D(e.plans[0]?.period?.[0]?.[1]) ? 1 : 1440 : (o - i + 1440) % 1440);
	}), {
		durations: r,
		enabled: !0,
		errors: t,
		warnings: n
	};
}
var O = {
	control: "控制中枢",
	trading: "贸易站",
	manufacture: "制造站",
	power: "发电站",
	meeting: "会客室",
	hire: "办公室",
	processing: "加工站",
	training: "训练室",
	dormitory: "宿舍"
}, Ce = [...C], we = {
	control: 1,
	trading: 5,
	manufacture: 5,
	power: 3,
	meeting: 1,
	hire: 1,
	dormitory: 4,
	processing: 1,
	training: 1
}, Te = {
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
}, Ee = {
	龙门币: "龙门币",
	合成玉: "合成玉",
	赤金: "赤金",
	中级作战记录: "作战记录",
	源石碎片: "源石碎片"
}, De = {
	LMD: "龙门币",
	Orundum: "合成玉",
	"Pure Gold": "赤金",
	"Battle Record": "中级作战记录",
	"Originium Shard": "源石碎片",
	作战记录: "中级作战记录",
	贵金属: "赤金"
};
function k(e) {
	let t = e.trim();
	return De[t] ?? t;
}
var Oe = {
	trading: "龙门币",
	manufacture: "赤金"
};
function ke(e) {
	let t = Oe[e];
	return t ? { product: t } : {};
}
Object.entries(Ee).map(([e, t]) => ({
	value: e,
	label: t
})), new Set(C);
function Ae(e) {
	return typeof e == "object" && !!e && !Array.isArray(e);
}
function je(e, t) {
	return e === "control" || e === "trading" || e === "manufacture" ? t : e === "power" || e === "hire" || e === "processing" ? 1 : e === "meeting" || e === "training" ? 2 : 5;
}
function Me(e, t) {
	return Te[e][t - 1] ?? 0;
}
function Ne(e, t, n) {
	let r = e.rooms[t];
	if (!Array.isArray(r)) return {};
	let i = r[n];
	if (!Ae(i)) return {};
	let a = i;
	if (typeof a.product != "string") return a;
	let o = k(a.product);
	return o === a.product ? a : {
		...a,
		product: o
	};
}
function Pe(e) {
	if (!e) return;
	let t = Object.fromEntries(Object.entries(e).map(([e, t]) => {
		let n = { ...t };
		return delete n.mood, [e, n];
	}));
	return Object.keys(t).length > 0 ? t : void 0;
}
function Fe(e, t, n, r) {
	let i = e.plans[t], a = i ? Ne(i, n, r) : {};
	if (!a.skip || e.plans.length === 0) return {
		assignment: a,
		inherited: !1
	};
	for (let i = 1; i <= e.plans.length; i += 1) {
		let o = (t - i + e.plans.length) % e.plans.length, s = e.plans[o];
		if (!s) continue;
		let c = Ne(s, n, r);
		if (c.skip || !c.operators?.some(Boolean)) continue;
		let l = Pe(c.operatorStates);
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
var Ie = [
	"control",
	"trading",
	"manufacture",
	"power",
	"meeting",
	"hire"
], Le = {
	trading: 100,
	manufacture: 100,
	power: 100,
	meeting: 107,
	hire: 100
}, Re = {
	1: 107,
	2: 109,
	3: 111
}, ze = {
	1: 24,
	2: 36,
	3: 54
}, Be = {
	1: 6,
	2: 8,
	3: 10
}, Ve = {
	productAmount: 20,
	materialAmount: 2,
	hours: 2
}, A = {
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
	baseEfficiency: Le,
	meetingEfficiencyByLevel: Re,
	manufactureStorageByLevel: ze,
	tradeOrderLimitByLevel: Be,
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
	orundumTradeOrder: Ve,
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
function He(e, t) {
	return `${e}-${t + 1}`;
}
function Ue(e) {
	let t = /* @__PURE__ */ new Map();
	return e.map((e) => {
		let n = t.get(e.type) ?? 0;
		return t.set(e.type, n + 1), {
			id: He(e.type, n),
			type: e.type,
			level: e.level,
			index: n
		};
	});
}
function We(e) {
	return Re[e] ?? Re[1] ?? 107;
}
function Ge(e, t, n = A) {
	return e === "meeting" ? n.meetingEfficiencyByLevel[t] ?? 107 : n.baseEfficiency[e] ?? 0;
}
function j(e, t, n = A) {
	if (!e) return;
	let r = k(e);
	return r === "源石碎片" ? n.manufactureRules[`源石碎片:${t || "固源岩"}`] : n.manufactureRules[r];
}
function Ke(e) {
	return e.filter((e) => e.type === "dormitory").reduce((e, t) => e + t.level * 1e3, 0);
}
function qe(e) {
	return e >= 4e3 ? 15 : e >= 3e3 ? 10 : e >= 2e3 ? 5 : 0;
}
function Je(e) {
	return e >= 6 ? 5 : e === 5 ? 4 : e === 4 ? 2 : 0;
}
function Ye(e) {
	return e >= 2 ? 16 : e >= 1 ? 8 : 0;
}
//#endregion
//#region src/utils/importLayout.ts
function Xe(e) {
	return typeof e == "object" && !!e && !Array.isArray(e);
}
function Ze(e, t, n) {
	return e.reduce((e, r) => {
		let i = r.rooms[t];
		if (!Array.isArray(i)) return e;
		let a = i[n];
		return Xe(a) && Array.isArray(a.operators) ? Math.max(e, a.operators.length) : e;
	}, 0);
}
function Qe(e, t) {
	return e.reduce((e, n) => {
		let r = n.rooms[t];
		return Array.isArray(r) ? Math.max(e, r.length) : e;
	}, 0);
}
function $e(e) {
	return e.reduce((e, t) => {
		let n = Te[t.type][t.level - 1] ?? 0;
		return n >= 0 ? e.provided += n : e.used += -n, e.net = e.provided - e.used, e;
	}, {
		provided: 0,
		used: 0,
		net: 0
	});
}
function et(e, t, n) {
	t.slice(0, we[e]).forEach((t) => {
		n.push({
			type: e,
			level: t
		});
	});
}
function tt(e, t) {
	let n = [], r = Math.max(0, t);
	for (; n.length < Math.min(e, 4) && r >= 10;) n.push(1), r -= 10;
	let i = [
		10,
		10,
		15,
		20
	];
	for (let e = 0; e < n.length; e += 1) for (; n[e] < 5;) {
		let t = n[e], a = i[t - 1] ?? 0;
		if (a > r) break;
		n[e] = t + 1, r -= a;
	}
	return n;
}
function nt(e) {
	let t = [], n = Object.fromEntries(C.map((t) => [t, Qe(e, t)]));
	n.control > 0 && et("control", [5], t), ["trading", "manufacture"].forEach((r) => {
		et(r, Array.from({ length: n[r] }, (t, n) => Math.max(1, Math.min(3, Ze(e, r, n) || 3))), t);
	});
	let r = Math.min(we.power, Math.max(n.power, e.reduce((e, t) => {
		let n = t.rooms.power;
		return Array.isArray(n) ? Math.max(e, n.reduce((e, t) => e + (Xe(t) && Array.isArray(t.operators) ? t.operators.filter(Boolean).length : 0), 0)) : e;
	}, 0)));
	et("power", Array.from({ length: r }, () => 3), t);
	let i = [
		"meeting",
		"processing",
		"hire",
		"training"
	], a = [
		3,
		3,
		3,
		3
	], o = $e(t).net >= ((e) => i.reduce((t, n, r) => t - (Te[n][e[r] - 1] ?? 0), 0))(a) ? a : [
		1,
		3,
		1,
		3
	];
	i.forEach((e, n) => {
		et(e, Array.from({ length: we[e] }, () => o[n]), t);
	});
	let s = $e(t);
	return et("dormitory", tt(we.dormitory, s.net), t), t;
}
function rt(e, t) {
	return e.map((e) => {
		let n = { ...e.rooms };
		return C.forEach((e) => {
			let r = t.filter((t) => t.type === e).length;
			if (r === 0) return;
			let i = Array.isArray(n[e]) ? [...n[e]] : [];
			if (e === "power" && i.length === 1) {
				let t = i[0];
				if (Xe(t) && Array.isArray(t.operators) && t.operators.length > 1) {
					let r = t, i = r.operatorStates, a = { ...r };
					delete a.operators, delete a.operatorStates;
					let o = r.operators ?? [];
					n[e] = o.filter(Boolean).map((e) => ({
						...a,
						operators: [e],
						...i?.[e] ? { operatorStates: { [e]: i[e] } } : {}
					}));
					return;
				}
			}
			for (; i.length < r;) i.push(ke(e));
			n[e] = i;
		}), {
			...e,
			rooms: n
		};
	});
}
function it(e, t) {
	return e.map((e) => {
		let n = { ...e.rooms };
		return Ce.forEach((e) => {
			let r = t.filter((t) => t.type === e);
			if (r.length === 0) {
				delete n[e];
				return;
			}
			let i = Array.isArray(n[e]) ? n[e] : [];
			n[e] = r.map((t, n) => {
				let r = Xe(i[n]) ? { ...i[n] } : ke(e), a = je(e, t.level);
				if (Array.isArray(r.operators) && (r.operators = r.operators.slice(0, a), r.operators.length === 0 && delete r.operators), r.operatorStates) {
					let e = new Set(r.operators ?? []);
					r.operatorStates = Object.fromEntries(Object.entries(r.operatorStates).filter(([t]) => e.has(t))), Object.keys(r.operatorStates).length === 0 && delete r.operatorStates;
				}
				return r;
			});
		}), {
			...e,
			rooms: n
		};
	});
}
function at(e) {
	return $e(e);
}
//#endregion
//#region src/utils/efficiency/basePoints.ts
var ot = [
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
function st(e, t) {
	return e.localeCompare(t, "zh-CN") || e.localeCompare(t);
}
function ct(e, t) {
	return st(e.name, t.name) || e.key.localeCompare(t.key);
}
function lt(e) {
	return ot.map((t) => ({
		key: t,
		name: e[t]?.name ?? t
	})).sort(ct);
}
function ut(e, t, n) {
	return t.value - e.value || ct({
		key: e.term,
		name: n[e.term]?.name ?? e.term
	}, {
		key: t.term,
		name: n[t.term]?.name ?? t.term
	});
}
function dt(e, t) {
	return t.value - e.value || (e.kind === t.kind ? 0 : e.kind === "gain" ? -1 : 1) || Ce.indexOf(e.facility) - Ce.indexOf(t.facility) || e.facilityIndex - t.facilityIndex || e.slotIndex - t.slotIndex;
}
//#endregion
//#region src/utils/efficiency/model.ts
var M = 1e-6, ft = 630 + 300 / 7, N = [
	"龙门币",
	"合成玉",
	"赤金",
	"中级作战记录",
	"源石碎片",
	"无人机",
	"信用",
	"公开招募标签刷新次数"
], P = /* @__PURE__ */ new Set([
	"tradeSpd",
	"manuProd",
	"clueSpeed",
	"hireSpd",
	"droneCharge",
	"abyssalBoost"
]), pt = /* @__PURE__ */ new Set([
	"tradeSpd",
	"manuProd",
	"droneCharge",
	"clueSpeed",
	"hireSpd"
]), mt = {
	trading: "tradeSpd",
	manufacture: "manuProd",
	power: "droneCharge",
	meeting: "clueSpeed",
	hire: "hireSpd"
}, ht = /* @__PURE__ */ new Set(["orderLimit", "storageCap"]), gt = /* @__PURE__ */ new Set(["basePointGain", "basePointConvert"]), _t = [
	"绮良",
	"鸿雪",
	"图耶"
], vt = {
	operators: /* @__PURE__ */ new Set(),
	exceptSources: /* @__PURE__ */ new Set()
};
function F(e) {
	return Math.max(0, Math.min(24, Number.isFinite(e) ? e : 24));
}
function yt(e) {
	return typeof e == "object" && !!e && !Array.isArray(e);
}
function I(e, t, n) {
	return Fe(e, t, n.type, n.index).assignment;
}
function bt(e) {
	return e.facilities.filter((e) => e.type === "trading").some((t) => (I(e.document, e.index, t).operators ?? []).some((e) => _t.includes(e)));
}
function xt(e, t) {
	return e.operatorStates?.[t] ?? {};
}
function St(e, t) {
	let n = e.firstItemProgress;
	if (typeof n == "number") return Math.max(0, Math.min(1, n));
	if (yt(n)) {
		let e = n[t] ?? n[t.replace(/-\d+$/, "")];
		return typeof e == "number" ? Math.max(0, Math.min(1, e)) : 0;
	}
	return 0;
}
//#endregion
//#region src/utils/efficiency/aggregate.ts
function Ct(e) {
	return typeof e == "number" ? e : e === "unowned" ? 8 : 9;
}
function wt(e) {
	return [...new Set(e)].sort((e, t) => Ct(e) - Ct(t));
}
function Tt(e, t) {
	return (e[0]?.facilities ?? []).map((n) => {
		let r = e.map((e) => e.facilities.find((e) => e.facility.id === n.facility.id)?.production).filter((e) => !!e), i = wt(e.flatMap((e) => e.facilities.find((e) => e.facility.id === n.facility.id)?.cluePreferences ?? []));
		if (r.length === 0 || t <= 1e-6) return n;
		let a = e.reduce((e, t) => {
			let r = t.facilities.find((e) => e.facility.id === n.facility.id)?.production;
			return r ? (e.base += r.baseAmountPerHour * t.durationHours, e.actual += r.amountPerHour * t.durationHours, e.effective += (r.effectiveAmountPerHour ?? r.amountPerHour) * t.durationHours, Object.entries(r.baseMaterialPerHour ?? r.materialPerHour ?? {}).forEach(([n, r]) => {
				e.baseMaterials[k(n)] = (e.baseMaterials[k(n)] ?? 0) + r * t.durationHours;
			}), Object.entries(r.materialPerHour ?? {}).forEach(([n, r]) => {
				e.materials[k(n)] = (e.materials[k(n)] ?? 0) + r * t.durationHours;
			}), Object.entries(r.effectiveMaterialPerHour ?? r.materialPerHour ?? {}).forEach(([n, r]) => {
				e.effectiveMaterials[k(n)] = (e.effectiveMaterials[k(n)] ?? 0) + r * t.durationHours;
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
				product: k(r[0]?.product ?? n.production?.product ?? ""),
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
function Et(e, t) {
	if (t <= 1e-6) return [];
	let n = /* @__PURE__ */ new Map();
	return e.forEach((e) => {
		e.facilities.forEach((t) => {
			let r = t.production;
			if (!r) return;
			let i = k(r.product), a = r.effectiveAmountPerHour ?? r.amountPerHour, o = n.get(i) ?? {
				basePerCycle: 0,
				actualPerCycle: 0,
				effectivePerCycle: 0,
				conversion: r.conversion,
				cluePreferences: [],
				baseMaterialsPerCycle: {},
				materialsPerCycle: {},
				effectiveMaterialsPerCycle: {}
			};
			!o.conversion && r.conversion && (o.conversion = r.conversion), o.cluePreferences = wt([...o.cluePreferences, ...r.cluePreferences ?? []]), o.basePerCycle += r.baseAmountPerHour * e.durationHours, o.actualPerCycle += r.amountPerHour * e.durationHours, o.effectivePerCycle += a * e.durationHours, Object.entries(r.baseMaterialPerHour ?? r.materialPerHour ?? {}).forEach(([t, n]) => {
				let r = k(t);
				o.baseMaterialsPerCycle[r] = (o.baseMaterialsPerCycle[r] ?? 0) + n * e.durationHours;
			}), Object.entries(r.materialPerHour ?? {}).forEach(([t, n]) => {
				let r = k(t);
				o.materialsPerCycle[r] = (o.materialsPerCycle[r] ?? 0) + n * e.durationHours;
			}), Object.entries(r.effectiveMaterialPerHour ?? r.materialPerHour ?? {}).forEach(([t, n]) => {
				let r = k(t);
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
function Dt(e) {
	return e.effectiveAmountPerDay ?? e.amountPerDay;
}
function Ot(e, t, n = A) {
	let r = /* @__PURE__ */ new Map(), i = /* @__PURE__ */ new Map();
	t.forEach((e) => {
		let t = k(e.product);
		t !== "线索" && r.set(t, Dt(e));
		let n = e.effectiveMaterialPerHour ?? e.materialPerHour ?? {};
		Object.entries(n).forEach(([e, t]) => {
			let n = k(e);
			i.set(n, (i.get(n) ?? 0) + t * 24);
		});
	});
	let a = e.layout.filter((e) => e.type === "dormitory").reduce((e, t) => e + Math.floor(10 + t.level * 1e3 / 125), 0), o = t.find((e) => k(e.product) === "线索");
	r.set("信用", ft + a + (o ? Dt(o) * n.creditPerClue : 0));
	let s = N.flatMap((e) => {
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
	})).filter((e) => e.consumed < -1e-6 && Math.abs(e.amountPerDay) > 1e-6).sort((e, t) => (N.indexOf(e.product) < 0 ? N.length : N.indexOf(e.product)) - (N.indexOf(t.product) < 0 ? N.length : N.indexOf(t.product)) || e.product.localeCompare(t.product)).map(({ product: e, kind: t, amountPerDay: n }) => ({
		product: e,
		kind: t,
		amountPerDay: n
	}));
	return [...s, ...c];
}
//#endregion
//#region src/utils/sanity.ts
var kt = 3, At = 1e3, jt = 500, Mt = {
	lmd: .0036,
	goldExperienceRatio: 1.2,
	orundum: .75,
	credit: 5.3271 / 129,
	recruitRefresh: 19.0787820209763,
	solidRock: null,
	device: null
}, Nt = [
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
		amountFactor: At,
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
function Pt(e) {
	return e * 60 / 3;
}
function Ft(e) {
	let t = e.goldExperienceRatio > 0 ? e.lmd / e.goldExperienceRatio : 0, n = t * At, r = j("中级作战记录", void 0)?.hours ?? 0, i = j("赤金", void 0)?.hours ?? 0, a = Pt(r), o = a > 0 ? n / a : 0, s = o * Pt(i), c = (Ve.productAmount * e.orundum - Pt(Ve.hours) * o) / Ve.materialAmount;
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
function It(e, t, n) {
	if (n === 0) return;
	let r = k(t);
	Nt.some((e) => e.resource === r) && (e[r] = (e[r] ?? 0) + n);
}
function Lt(e, t, n) {
	let r = t.effectiveAmountPerHour ?? t.amountPerHour;
	t.product === "线索" ? It(e, "信用", r * n * (t.conversion?.amountPerUnit ?? 0)) : It(e, t.product, r * n);
	let i = t.effectiveMaterialPerHour ?? t.materialPerHour ?? {};
	Object.entries(i).forEach(([t, r]) => {
		It(e, t, r * n);
	});
}
function Rt(e, t) {
	let n = [], r = 0;
	return {
		items: Nt.flatMap((i) => {
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
function zt() {
	return Nt;
}
//#endregion
//#region src/utils/efficiency/calculate.ts
function Bt(e) {
	return e.ruleset ?? A;
}
function Vt(e) {
	return e.effect.stat === "facBase" || nr(e);
}
function Ht(e, t, n, r, i, a, o) {
	let s = ie(n, t);
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
function Ut(e, t) {
	let n = Number(e.unlock?.value ?? 0);
	return e.unlock?.type === "level" ? (t.level ?? 30) >= n : (t.elite ?? 0) >= n;
}
function Wt(e, t, n, r) {
	let i = t ? t.chains.filter((e) => e.room === n).flatMap((e) => {
		let t = e.stages.filter((e) => Ut(e, r)).at(-1);
		return t ? t.effects.map((e) => ({
			skill: t.name,
			effect: e
		})) : [];
	}) : [], a = ce(e), o = mt[n];
	return a !== void 0 && o !== void 0 ? [...i, {
		skill: `${e}效率`,
		effect: {
			target: n,
			stat: o,
			value: a
		}
	}] : i;
}
function Gt(e, t, n, r = !1, i = !1) {
	let a = Ue(e.layout), o = t.ruleset ?? A, s = Se(e);
	return e.plans.map((c, l) => {
		let u = Math.max(0, Number(s.durations[l] ?? c.duration ?? o.defaultDurationMinutes) / 60), d = [], f = [];
		return a.forEach((a) => {
			let o = I(e, l, a);
			o.operators?.some(Boolean) && (o.operators ?? []).forEach((e, s) => {
				if (!e) return;
				let c = ie(t, e);
				!c && !pe(e, t) && f.push(`队列 ${l + 1}：找不到干员“${e}”的技能数据`);
				let u = xt(o, e), p = pe(e, t), m = Ht(n, e, t, a, u, r, i), h = {
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
					selected: Wt(e, c?.skillFile, a.type, h),
					explicitMood: !p && Object.prototype.hasOwnProperty.call(u, "mood"),
					moodStart: p ? 24 : F(u.mood ?? 24),
					moodEnd: p ? 24 : F(u.mood ?? 24),
					costRate: 0,
					moodRateDetails: [],
					working: !0,
					workHoursBefore: 0,
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
function L(e) {
	return Ie.includes(e.facility.type);
}
function R(e, t) {
	return e.facility.type !== "dormitory" && !pe(e.name, t);
}
function z(e) {
	return e.working && (!L(e) || e.moodStart > 1e-6);
}
function B(e, t) {
	return e.placements.filter((e) => e.facility.id === t.id);
}
function Kt(e, t) {
	return e.placements.filter((e) => e.facility.type === t);
}
function V(e, t = !1) {
	return !t || e.moodStart > 1e-6;
}
function qt(e, t, n) {
	if (gt.has(e.stat) || e.stat === "facilityCount" || e.stat === "skillTagConvert") return [void 0];
	if (e.target === "training" || e.target === "processing") return [];
	if (e.target === "any") return e.facilities?.length ? n.filter((t) => e.facilities?.includes(t.type)) : n.filter((e) => Ie.includes(e.type) || e.type === "dormitory");
	let r = e.target, i = n.filter((e) => e.type === r);
	return i.length === 0 ? [] : t.facility.type === r ? [t.facility] : i;
}
function Jt(e, t, n = "ge") {
	return n === "gt" ? e > t : n === "le" ? e <= t : n === "lt" ? e < t : e >= t;
}
function Yt(e, t) {
	return typeof t == "number" ? t : t ? e.basePoints[t] ?? 0 : 0;
}
function Xt(e, t, n, r, i) {
	return i.terms[n]?.members?.includes(t) ? !0 : r.active.some((r) => r.effect.stat === "skillTagConvert" && r.effect.tagTo === n && r.owner.facility.id === e.facility.id && r.effect.tagFrom?.some((e) => i.terms[e]?.members?.includes(t)) === !0);
}
function Zt(e, t, n) {
	return t === "same" ? B(e, n.facility) : t ? Kt(e, t) : [];
}
function Qt(e, t, n, r, i) {
	if (!e) return !0;
	let a;
	switch (e.type) {
		case "opAtFacility":
			a = Zt(r, e.facility, t).some((t) => t.name === String(e.op ?? "") && V(t, e.moodCheck));
			break;
		case "opInBase":
			a = r.placements.some((t) => t.name === String(e.op ?? "") && (!e.facilities?.length || e.facilities.includes(t.facility.type)) && V(t, e.moodCheck));
			break;
		case "opInFacilityAndTarget":
			a = r.placements.some((t) => t.name === String(e.op ?? "") && t.facility.type === e.facility && t.facility.id === n?.id && V(t, e.moodCheck));
			break;
		case "opGroupInFacility":
		case "opGroupNotInFacility": {
			let n = Zt(r, e.facility, t).filter((t) => V(t, e.moodCheck)).filter((n) => !e.other || n.name !== t.name).some((t) => E(i, e.group, t.name));
			a = e.type === "opGroupNotInFacility" ? !n : n;
			break;
		}
		case "opGroupCountInFacility":
			a = Zt(r, e.facility, t).filter((t) => V(t, e.moodCheck)).filter((t) => E(i, e.group, t.name)).filter((n) => !e.other || n.name !== t.name).length >= Number(e.min ?? 1);
			break;
		case "opGroupCountInBase":
			a = r.placements.filter((t) => !e.exclude?.includes(t.facility.type)).filter((t) => V(t, e.moodCheck)).filter((t) => E(i, e.group, t.name)).filter((n) => !e.other || n.name !== t.name).length >= Number(e.min ?? 1);
			break;
		case "onlySelf": {
			let e = r.placements.filter((e) => e.facility.id === t.facility.id && z(e));
			a = e.length === 1 && e[0]?.name === t.name;
			break;
		}
		case "clueExchanging":
			a = r.plan.rooms.meeting !== void 0 && r.settings.clueExchanging !== !1;
			break;
		case "moodCmp":
			a = Jt(t.moodStart, Number(e.value ?? 0), e.op);
			break;
		case "moodDrop":
			a = Jt(sn(t, r.durationHours), Number(e.value ?? 0), e.op ?? "gt");
			break;
		case "termCmp":
			a = Jt(Yt(r, e.a), Yt(r, e.b), e.op);
			break;
		case "statCmp": {
			let i = `${n?.id ?? t.facility.id}:${e.stat ?? ""}`, o = n?.type === "hire" ? Ge(n.type, n.level, r.ruleset) : 0;
			a = Jt(r.statValues.get(i) ?? 0, Number(e.value ?? 0) + o, e.op);
			break;
		}
		case "workHours":
			a = t.workHoursBefore + r.durationHours >= Number(e.value ?? 0);
			break;
		default: a = !1;
	}
	return e.negate ? !a : a;
}
function $t(e, t) {
	return e.facilities.filter((e) => e.type === t).length + e.active.filter((e) => e.effect.stat === "facilityCount" && e.effect.target === t).reduce((e, t) => e + Number(t.effect.value ?? 0), 0);
}
function en(e, t) {
	return Math.max(0, e.settings.tradeOrderCount?.[t.id] ?? 0);
}
function tn(e, t) {
	return t ? e.basePoints[t] ?? 0 : 0;
}
function nn(e, t) {
	return e.selected.some((e) => e.skill === t && (e.effect.per?.source === "moodDrop" || e.effect.condition?.type === "moodDrop"));
}
function H(e) {
	return nn(e.owner, e.skill);
}
function rn(e, t) {
	return e.moodStart <= 1e-6 ? 0 : e.costRate > 1e-6 ? Math.min(t, e.moodStart / e.costRate) : t;
}
function an(e, t) {
	return F(e.moodStart - e.costRate * t);
}
function on(e, t) {
	return 24 - an(e, t);
}
function sn(e, t) {
	if (t <= 1e-6) return 0;
	let n = rn(e, t);
	return n <= 1e-6 ? 0 : (on(e, 0) + on(e, n)) / 2 * (n / t);
}
function cn(e, t, n, r, i, a, o) {
	let s = r === "any" || !n ? t.facility : n, c = (e) => e === "same" || !e ? B(i, s) : Kt(i, e), l = 0;
	switch (e.source) {
		case "basePoint":
			l = tn(i, e.term);
			break;
		case "facilityCount":
			l = $t(i, e.facility ?? "power");
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
			l = i.settings.dormFullTreat === !1 ? B(i, e).length : je("dormitory", e.level);
			break;
		}
		case "dormOccupants":
			l = i.facilities.filter((e) => e.type === "dormitory").reduce((e, t) => e + (i.settings.dormFullTreat === !1 ? B(i, t).length : je("dormitory", t.level)), 0);
			break;
		case "dormOccupantsOwn":
			l = t.facility.type === "dormitory" ? B(i, t.facility).filter((e) => e.name !== t.name).length : 0;
			break;
		case "dormNotFull":
			l = t.facility.type === "dormitory" ? B(i, t.facility).filter((e) => e.moodStart < 24 - M).length : 0;
			break;
		case "recruitSlots":
			l = i.facilities.filter((e) => e.type === "hire").reduce((e, t) => e + Math.max(0, t.level - 1), 0);
			break;
		case "opCount":
			l = c(e.facility).filter((t) => V(t, e.moodCheck)).filter((n) => !e.other || n.name !== t.name).length;
			break;
		case "opGroupInBase":
			l = i.placements.filter((t) => !e.exclude?.includes(t.facility.type)).filter((t) => V(t, e.moodCheck)).filter((t) => E(a, e.group, t.name)).filter((n) => !e.other || n.name !== t.name).length;
			break;
		case "opGroupInFacility":
			l = c(e.facility).filter((t) => V(t, e.moodCheck)).filter((t) => E(a, e.group, t.name)).filter((n) => !e.other || n.name !== t.name).filter((t) => !e.fullMood || t.moodStart >= 24 - 1e-6).length;
			break;
		case "baseFacilityWithGroup":
			l = i.facilities.filter((t) => B(i, t).some((t) => E(a, e.group, t.name) && V(t, e.moodCheck))).length;
			break;
		case "skillOwners": {
			let t = a.terms[e.term ?? ""]?.members ?? [];
			l = Kt(i, "control").filter((t) => V(t, e.moodCheck)).filter((e) => e.selected.some((e) => t.includes(e.skill))).length;
			break;
		}
		case "skillTagCount":
			l = c(e.facility).filter((t) => V(t, e.moodCheck)).reduce((t, n) => t + n.selected.filter(({ skill: t }) => Xt(n, t, e.tag ?? "", i, a)).length, 0);
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
			l = sn(t, i.durationHours);
			break;
		case "orderCount":
			l = n ? en(i, n) : 0;
			break;
		case "orderLimitNet":
			l = o.capBoosts.orderLimit ? Object.values(o.capBoosts.orderLimit).reduce((e, t) => e + t, 0) : 0;
			break;
		case "droneLimit":
			l = Bt(a).droneLimit;
			break;
		case "manuRecipes":
			l = new Set(i.facilities.filter((e) => e.type === "manufacture").map((e) => {
				let t = I(i.document, i.index, e);
				return j(t.product, t.sourceMaterial, Bt(a))?.recipe;
			}).filter((e) => !!e)).size;
			break;
		case "abyssalBoost": {
			let t = c("same").filter((t) => E(a, e.group, t.name) && V(t, e.moodCheck)).length, n = i.placements.filter((e) => e.facility.type === "manufacture").filter((t) => E(a, e.group, t.name) && V(t, e.moodCheck)).length, r = t * n * Number(e.value ?? 0);
			return {
				value: e.capUnit === "value" ? Math.min(r, Number(e.cap ?? Infinity)) : r,
				count: t,
				times: t * n
			};
		}
		default: l = 0;
	}
	let u = Math.max(M, Number(e.per) || 1), d = e.floor ?? e.source !== "facCap" ? e.source === "stat" && e.statScope === "targetFacility" ? Math.floor(l / u) : Math.max(0, Math.floor(l / u)) : l / u, f = d * (Number(e.value) || 0);
	return {
		value: e.capUnit === "value" ? Math.min(f, Number(e.cap ?? Infinity)) : e.cap === void 0 ? f : Math.min(d, e.cap) * (Number(e.value) || 0),
		count: l,
		times: d
	};
}
function ln(e, t, n) {
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
function un(e, t) {
	let n = Math.max(M, Number(e.per) || 1), r = e.floor ?? !0 ? Math.max(0, Math.floor(t / n)) : Math.max(0, t / n), i = r * (Number(e.value) || 0);
	return e.capUnit === "value" ? Math.min(i, Number(e.cap ?? Infinity)) : e.cap === void 0 ? i : Math.min(r, e.cap) * (Number(e.value) || 0);
}
function dn(e, t) {
	let n = Jt(t, Number(e.value ?? 0), e.op ?? "gt");
	return e.negate ? !n : n;
}
function fn(e, t, n, r, i, a) {
	let { effect: o, owner: s } = e, c = hn(i, a), l = rn(s, n.durationHours);
	if (a > l + 1e-6 || a >= l - 1e-6 && an(s, a) <= 1e-6) return 0;
	let u;
	if (u = o.per?.source === "moodDrop" ? un(o.per, on(s, a)) : o.curve ? Math.min(o.curve.startValue + (s.workHoursBefore + a - o.curve.startHours) * o.curve.step, o.curve.cap) : o.per ? cn(o.per, s, t, o.target, n, r, c).value : Number(o.value ?? 0) + Number(o.baseValue ?? 0), o.condition?.type === "moodDrop" && !dn(o.condition, on(s, a))) return 0;
	if (o.condition?.type === "workHours") {
		let e = Number(o.condition.value ?? 0);
		if (s.workHoursBefore + a < e) return 0;
	}
	return u;
}
function pn(e, t) {
	let { effect: n, owner: r } = e, i = rn(r, t), a = [0, i], o = r.costRate;
	if (Math.abs(o) > 1e-6) {
		let e = on(r, 0), t = (t) => {
			let n = (t - e) / o;
			n > 1e-6 && n < i - 1e-6 && a.push(n);
		};
		if (n.per?.source === "moodDrop") {
			let e = Math.max(M, Number(n.per.per) || 1);
			for (let n = 0; n <= 24 + M; n += e) t(n);
		}
		n.condition?.type === "moodDrop" && t(Number(n.condition.value ?? 0));
	}
	if (n.condition?.type === "workHours") {
		let e = Number(n.condition.value ?? 0) - r.workHoursBefore;
		e > 1e-6 && e < i - 1e-6 && a.push(e);
	}
	return Array.from(new Set(a.map((e) => Math.max(0, e)))).sort((e, t) => e - t);
}
function mn(e, t, n, r, i) {
	let a = n.durationHours;
	if (a <= 1e-6) return 0;
	let o = Array.from(/* @__PURE__ */ new Set([...pn(e, a), ...(i.capacitySegments ?? []).flatMap(({ startHours: e, endHours: t }) => [e, t])])).sort((e, t) => e - t), s = 0;
	for (let a = 1; a < o.length; a += 1) {
		let c = o[a - 1] ?? 0, l = o[a] ?? c;
		l <= c + 1e-6 || (s += fn(e, t, n, r, i, (c + l) / 2) * (l - c));
	}
	return s / a;
}
function hn(e, t) {
	let n = e.capacitySegments, r = n?.find((e) => t >= e.startHours - 1e-6 && t < e.endHours - 1e-6) ?? (t <= (n?.at(-1)?.endHours ?? 0) + 1e-6 ? n?.at(-1) : void 0), i = e.bonusSegments?.find((e) => t >= e.startHours - 1e-6 && t < e.endHours - 1e-6) ?? (t <= (e.bonusSegments?.at(-1)?.endHours ?? 0) + 1e-6 ? e.bonusSegments?.at(-1) : void 0);
	return !r && !i ? e : {
		...e,
		...r ? { capBoosts: r.capBoosts } : {},
		...i ? {
			bonusByFacility: i.bonusByFacility,
			sameFacilityBonusByFacility: i.sameFacilityBonusByFacility
		} : {}
	};
}
function gn(e, t, n, r, i) {
	let a = e.effect.per, o = i.bonusSegments;
	if (a?.source !== "stat") return {
		value: 0,
		steps: []
	};
	if (!o) return {
		value: cn(a, e.owner, t, e.effect.target, n, r, i).value,
		steps: []
	};
	let s = o.flatMap((o) => {
		if (o.endHours <= o.startHours + 1e-6) return [];
		let s = (o.startHours + o.endHours) / 2, c = hn(i, s), l = H(e) ? fn(e, t, n, r, c, s) : e.effect.condition?.type === "workHours" && e.owner.workHoursBefore + s < Number(e.effect.condition.value ?? 0) ? 0 : cn(a, e.owner, t, e.effect.target, n, r, c).value;
		return [{
			startHours: o.startHours,
			endHours: o.endHours,
			value: l
		}];
	});
	return {
		value: n.durationHours > 1e-6 ? s.reduce((e, t) => e + t.value * (t.endHours - t.startHours), 0) / n.durationHours : 0,
		steps: s
	};
}
function _n(e, t, n, r, i) {
	if (e.effect.per?.source !== "stat" || !i.bonusSegments) return;
	let { steps: a } = gn(e, t, n, r, i), o = [];
	if (a.forEach((e) => {
		let t = o[o.length - 1];
		t && Math.abs(t.value - e.value) <= 1e-6 ? t.endHours = e.endHours : o.push({ ...e });
	}), !(o.length < 2)) return {
		type: "stat",
		durationHours: n.durationHours,
		steps: o
	};
}
function vn(e, t, n, r, i) {
	let a = n.durationHours, o = i.capacitySegments;
	return a <= 1e-6 || !o || o.length === 0 ? 0 : o.reduce((a, o) => {
		let s = Math.max(0, o.endHours - o.startHours);
		if (s <= 1e-6) return a;
		let c = hn(i, (o.startHours + o.endHours) / 2);
		return a + cn(e.effect.per, e.owner, t, e.effect.target, n, r, c).value * s;
	}, 0) / a;
}
function yn(e, t) {
	if (e.effect.condition?.type !== "workHours") return;
	let n = Number(e.effect.condition.value ?? 0);
	return {
		threshold: n,
		activeHours: Math.max(0, Math.min(t.durationHours, e.owner.workHoursBefore + t.durationHours - n))
	};
}
function U(e, t, n, r, i) {
	if (e.effect.per?.source === "stat" && i.bonusSegments) return gn(e, t, n, r, i).value;
	if (H(e)) return mn(e, t, n, r, i);
	if ((e.effect.per?.source === "facCap" || e.effect.per?.source === "capTier") && (i.capacitySegments?.length ?? 0) > 1) return vn(e, t, n, r, i);
	let { effect: a, owner: o } = e, s;
	s = a.curve ? ln(a.curve, n.durationHours, o.workHoursBefore).value : a.per ? cn(a.per, o, t, a.target, n, r, i).value : Number(a.value ?? 0) + Number(a.baseValue ?? 0);
	let c = yn(e, n);
	return c && (s *= n.durationHours > 1e-6 ? c.activeHours / n.durationHours : 0), s;
}
function bn(e, t, n, r, i, a) {
	if (H(e)) return fn(e, t, n, r, i, a);
	if (e.effect.condition?.type === "workHours" && e.owner.workHoursBefore + a < Number(e.effect.condition.value ?? 0)) return 0;
	let o = hn(i, a);
	if (e.effect.curve) {
		let t = Math.max(1, Math.ceil(a));
		return Math.min(e.effect.curve.startValue + (e.owner.workHoursBefore + t - e.effect.curve.startHours) * e.effect.curve.step, e.effect.curve.cap);
	}
	return e.effect.per ? cn(e.effect.per, e.owner, t, e.effect.target, n, r, o).value : Number(e.effect.value ?? 0) + Number(e.effect.baseValue ?? 0);
}
function xn(e, t) {
	let { effect: n, owner: r } = e, i = yn(e, t);
	if (n.curve) {
		let e = ln(n.curve, t.durationHours, r.workHoursBefore);
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
function Sn(e, t, n, r) {
	let { effect: i, owner: a } = e;
	return !(e.target?.id !== n.id || i.other && t.name === a.name || i.scope === "op" && t.name !== i.op || i.scope === "room" && t.facility.id !== a.facility.id || i.moodBelow !== void 0 && !(t.moodStart < Number(i.moodBelow)) || i.scopeGroup && !E(r, i.scopeGroup, t.name) || !i.scope && i.target !== "any" && t.name !== a.name);
}
function Cn(e, t, n, r) {
	return Sn(e, t, n, r) && (!e.effect.group || E(r, e.effect.group, t.name));
}
function wn(e, t) {
	return e.owner.name === t.name ? e.effect.scope === "self" ? !0 : e.effect.scope === "op" ? e.effect.op === t.name : e.effect.scope === void 0 && e.effect.target !== "any" : !1;
}
function Tn(e, t, n = !1) {
	let r = [];
	return e.placements.filter((e) => z(e)).forEach((i) => {
		i.selected.forEach(({ skill: a, effect: o }) => {
			n && o.condition?.type === "statCmp" || qt(o, i, e.facilities).forEach((n) => {
				(o.condition?.type === "moodDrop" && (P.has(o.stat) || ht.has(o.stat)) || Qt(o.condition, i, n, e, t)) && r.push({
					owner: i,
					effect: o,
					skill: a,
					target: n
				});
			});
		});
	}), r;
}
function En(e, t) {
	if (typeof e.cluePreference == "number" || e.cluePreference === "unowned" || e.cluePreference === "owned") return e.cluePreference;
	let n = e.text ?? "";
	return n.includes("尚未拥有") ? "unowned" : n.includes("已经拥有") ? "owned" : Object.entries(Bt(t).cluePreferenceByFaction).find(([e]) => n.includes(e))?.[1];
}
function Dn(e) {
	return typeof e == "number" ? e : e === "unowned" ? 8 : 9;
}
function On(e) {
	return [...new Set(e)].sort((e, t) => Dn(e) - Dn(t));
}
function kn(e, t) {
	return On(e.active.filter((e) => e.target?.id === t.id && e.effect.stat === "clueChance").map((t) => En(t.effect, e.catalog)).filter((e) => e !== void 0));
}
function An(e, t, n) {
	let r = e[t] ?? (e[t] = []), i = r.find((e) => e.kind === n.kind && e.operator === n.operator && e.skill === n.skill && e.facility === n.facility && e.facilityIndex === n.facilityIndex && e.slotIndex === n.slotIndex && e.from === n.from && e.rate === n.rate);
	i ? i.value += n.value : r.push(n);
}
function jn(e) {
	let t = e.filter((e) => e.effect.stat === "basePointConvert" && !!e.effect.from && !!e.effect.to), n = [];
	for (; t.length > 0;) {
		let e = t.findIndex((e) => !t.some((t) => t !== e && t.effect.to === e.effect.from)), [r] = t.splice(e >= 0 ? e : 0, 1);
		r && n.push(r);
	}
	return n;
}
function Mn(e) {
	return e.effect.stat === "basePointGain" && e.effect.per?.source === "basePoint" && e.effect.per.term === e.effect.term;
}
function Nn(e, t, n, r) {
	let i = {}, a = {};
	return e.basePoints = i, e.facilities.filter((e) => e.type === "manufacture").filter((t) => {
		let n = I(e.document, e.index, t);
		return j(n.product, n.sourceMaterial, e.ruleset)?.recipe === "贵金属";
	}).forEach((e) => {
		i["cc.t.flow_gold"] = (i["cc.t.flow_gold"] ?? 0) + 1, An(a, "cc.t.flow_gold", {
			kind: "gain",
			operator: "生产赤金",
			facility: "manufacture",
			facilityIndex: e.index,
			slotIndex: 0,
			value: 1
		});
	}), e.basePoints = { ...i }, t.filter(Mn).forEach((t) => {
		let o = t.effect.term;
		if (!o) return;
		let s = U(t, t.target, e, n, r);
		i[o] = (i[o] ?? 0) + s, s > 1e-6 && An(a, o, {
			kind: "gain",
			operator: t.owner.name,
			skill: t.skill,
			facility: t.owner.facility.type,
			facilityIndex: t.owner.facility.index,
			slotIndex: t.owner.index,
			value: s
		});
	}), e.basePoints = i, t.filter((e) => e.effect.stat === "basePointGain").filter((e) => !Mn(e)).forEach((t) => {
		let o = t.effect.term;
		if (!o) return;
		let s = U(t, t.target, e, n, r);
		i[o] = (i[o] ?? 0) + s, s > 1e-6 && An(a, o, {
			kind: "gain",
			operator: t.owner.name,
			skill: t.skill,
			facility: t.owner.facility.type,
			facilityIndex: t.owner.facility.index,
			slotIndex: t.owner.index,
			value: s
		});
	}), jn(t).forEach((e) => {
		let t = e.effect.from, n = e.effect.to;
		if (!t || !n) return;
		let r = Math.max(0, (i[t] ?? 0) * Number(e.effect.rate ?? 0));
		i[n] = (i[n] ?? 0) + r, r > 1e-6 && An(a, n, {
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
		details: Object.entries(i).filter(([t, n]) => n > 1e-6 && (t !== "cc.t.flow_gold" || bt(e))).map(([e, t]) => ({
			term: e,
			value: t,
			sources: [...a[e] ?? []].sort(dt)
		})).sort((e, t) => ut(e, t, n.terms))
	};
}
function Pn(e, t, n) {
	let r = /* @__PURE__ */ new Map();
	return e.facilities.forEach((i) => {
		let a = {
			capBoosts: {},
			bonusByFacility: {}
		}, o = er(e, i), s = G(e, i, n, t, a, vt, /* @__PURE__ */ new Set([...P, "facBase"]), "base"), c = G(e, i, n, t, a, o, P, "combination"), l = G(e, i, n, t, a, o, P, "combination", "stat"), u = B(e, i).reduce((e, t) => e + dr(i, t), 0), d = Ge(i.type, i.level, e.ruleset);
		if (i.type === "meeting") {
			let t = e.facilities.filter((e) => e.type === "dormitory").reduce((e, t) => e + t.level * 1e3, 0);
			d += qe(t);
		}
		r.set(`${i.id}:${i.type === "hire" ? "hireSpd" : i.type === "trading" ? "tradeSpd" : i.type === "manufacture" ? "manuProd" : "clueSpeed"}`, d + s.total + u + c.total + l.total);
	}), r;
}
function Fn(e, t, n, r) {
	if (pe(t.name, n) || !z(t) || !L(t)) return {
		rate: 0,
		details: []
	};
	let i = [{
		kind: "base",
		value: 1
	}], a = Kt(e, "control").filter((e) => z(e)).length, o = 1 - a * .05;
	if (a > 0 && i.push({
		kind: "controlWorkers",
		value: -a * .05,
		count: a
	}), t.facility.type === "trading" || t.facility.type === "manufacture") {
		let n = B(e, t.facility).filter((e) => z(e)).length;
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
	let s = e.active.filter((e) => e.effect.stat === "zeroOpMood");
	return In(e, t, n, r).flatMap(({ item: e, value: r }) => {
		let i = e.effect.stat === "moodRecover" ? -r : r;
		return s.some((r) => Cn(r, t, t.facility, n) && (wn(e, t) || r.effect.target === "control" && r.target?.id === e.target?.id)) ? [] : [{
			cost: i,
			detail: {
				kind: "skill",
				value: i,
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
function In(e, t, n, r) {
	let i = [], a = /* @__PURE__ */ new Map();
	e.active.filter((e) => e.effect.stat === "moodCost" || e.effect.stat === "moodRecover").filter((e) => Sn(e, t, t.facility, n)).forEach((o) => {
		let s = U(o, t.facility, e, n, r);
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
function Ln(e) {
	return e.fiammettaMode === "queue" ? "queue" : "direct";
}
function Rn(e, t) {
	return (Ln(e.settings) === "queue" ? e.document.fiammetta?.queue?.[t] : t === 0 ? e.document.fiammetta?.direct : void 0)?.operators?.find(Boolean);
}
function zn(e) {
	return e.fiammetta?.direct?.operators?.filter(Boolean) ?? [];
}
function Bn(e) {
	return e.some((e) => e.placements.some((e) => e.name === "菲亚梅塔" && e.facility.type === "dormitory"));
}
function Vn(e, t, n) {
	return !n || t.name === "菲亚梅塔" ? !1 : Ln(e.settings) === "queue" ? Rn(e, e.index) === t.name : zn(e.document).includes(t.name);
}
function Hn(e, t) {
	let n = e.placements.find((e) => e.name === "菲亚梅塔" && e.facility.type === "dormitory");
	return n ? n.selected.filter(({ effect: e }) => e.stat === "moodRecover").reduce((r, { effect: i, skill: a }) => r + U({
		owner: n,
		effect: i,
		skill: a,
		target: n.facility
	}, n.facility, e, t, Zn()), 0) : 0;
}
function Un(e, t) {
	if (e.forEach((e) => {
		e.fiammettaWarnings = [];
	}), !Bn(e)) {
		e.forEach((e) => {
			e.fiammetta = void 0;
		});
		return;
	}
	let n = Ln(e[0]?.settings ?? {}), r = [];
	if (n === "queue") {
		let i = 24;
		return e.forEach((n, a) => {
			let o = Rn(n, a), s = (a - 1 + e.length) % e.length, c = (o ? e[s]?.placements.find((e) => e.name === o) : void 0)?.moodEnd ?? 24;
			o && i < 24 - 1e-6 && e.length > 1 && e[s]?.fiammettaWarnings.push(`菲亚梅塔在${s + 1}队列结束后无法恢复心情`);
			let l = i;
			o && (i = c);
			let u = Hn(n, t), d = u * n.durationHours > 1e-6 ? u * n.durationHours : 0, f = F(i + (u > 1e-6 ? d : 0));
			n.fiammetta = {
				...o ? { target: o } : {},
				targetMood: c,
				start: l,
				end: f,
				recoverRate: u,
				recoverHours: d,
				resting: u > M
			}, r.push(n.fiammetta), i = f;
		}), {
			mode: n,
			plans: r,
			directTargets: [],
			totalConsumption: 0,
			totalRecovery: r.reduce((e, t) => e + (t?.recoverHours ?? 0), 0)
		};
	}
	let i = zn(e[0].document), a = 0, o = 0;
	return e.forEach((e) => {
		let n = Hn(e, t), s = n * e.durationHours;
		o += s, e.placements.forEach((t) => {
			i.includes(t.name) && L(t) && (a += t.costRate * e.durationHours);
		}), e.fiammetta = {
			target: i[e.index],
			targetMood: (i[e.index], 24),
			start: 24,
			end: 24,
			recoverRate: n,
			recoverHours: s,
			resting: n > M
		}, r.push(e.fiammetta);
	}), a > o + 1e-6 && i.length > 0 && e[0]?.fiammettaWarnings.push("菲亚梅塔无法完全恢复这些干员心情"), {
		mode: n,
		plans: r,
		directTargets: i,
		totalConsumption: a,
		totalRecovery: o
	};
}
function Wn(e, t, n) {
	for (let r = 1; r <= e.length; r += 1) {
		let i = e[(t + r) % e.length]?.placements.find((e) => e.name === n && L(e));
		if (i) return i.fiammettaForced ? 24 : i.explicitMood ? F(i.state.mood ?? 24) : 24;
	}
	return 24;
}
function Gn(e, t, n, r) {
	let { effect: i, owner: a } = e;
	return !(e.target?.id !== n.id || i.other && t.name === a.name || i.scope === "self" && t.name !== a.name || i.scope === "op" && t.name !== i.op || i.scope === "room" && a.facility.type === "dormitory" && a.facility.id !== n.id || i.op && t.name !== i.op || i.moodBelow !== void 0 && !(t.moodStart < Number(i.moodBelow)) || i.scopeGroup && !E(r, i.scopeGroup, t.name) || !i.scope && i.target !== "any" && t.name !== a.name);
}
function Kn(e, t, n, r) {
	let i = 0, a = /* @__PURE__ */ new Map();
	return e.forEach((e) => {
		let o = U(e, t, n, r, Zn());
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
function qn(e, t, n, r, i, a) {
	let o = e.active.filter((e) => e.target?.id === t.id && e.effect.stat === "moodRecover"), s = o.filter((e) => e.owner.name === n.name);
	if (s.some((e) => e.effect.blockOtherRecovery === !0)) return Kn(s.filter((e) => e.effect.scope === "self"), t, e, a);
	let c = (e) => Gn(e, n, t, a), l = o.filter((e) => e.effect.subjects === void 0 && (e.effect.scope === "room" || e.owner.facility.type !== "dormitory") && c(e)), u = s.filter((e) => e.effect.scope === "self" && c(e)), d = r.filter((e) => e.moodStart < (i.get(e.name) ?? 24) - M), f = o.filter((e) => e.effect.subjects === "single" && d.slice().sort((e, t) => e.moodStart - t.moodStart || e.index - t.index)[0]?.name === n.name && c(e)), p = d.length, m = p > 0 ? o.filter((e) => e.effect.subjects === "spread").filter(c).map((n) => ({
		...n,
		effect: {
			...n.effect,
			value: U(n, t, e, a, Zn()) / p,
			baseValue: void 0,
			per: void 0,
			curve: void 0
		}
	})) : [];
	return 1.5 + .5 * t.level + Kn(l, t, e, a) + Kn(u, t, e, a) + Kn(f, t, e, a) + Kn(m, t, e, a);
}
function Jn(e, t, n, r, i, a) {
	let o = xt(t.assignment, t.name), s = Ht(e.settings.progressionProfile, t.name, a, n, o, e.settings.treatSkillsAsUnlocked ?? !1, e.settings.dormitoryDefaultIncludesMoodRecovery ?? !1), c = {
		...o,
		elite: s.elite,
		level: s.level
	}, l = ie(a, t.name);
	return {
		...t,
		facility: n,
		assignment: I(e.document, e.index, n),
		index: r,
		state: c,
		profile: l,
		skillFile: l?.skillFile,
		selected: Wt(t.name, l?.skillFile, "dormitory", c),
		explicitMood: !1,
		moodStart: i,
		moodEnd: i,
		costRate: 0,
		moodRateDetails: [],
		working: !0,
		workHoursBefore: 0,
		fiammettaForced: !1
	};
}
function Yn(e, t) {
	e.length <= 1 || e.forEach((n, r) => {
		let i = e[(r - 1 + e.length) % e.length];
		if (!i) return;
		n.autoRestWarnings = [];
		let a = [];
		i.placements.forEach((i, o) => {
			if (!R(i, t)) return;
			let s = Wn(e, r, i.name);
			if (i.moodEnd >= s - 1e-6) return;
			let c = n.placements.find((e) => e.name === i.name);
			n.placements.some((e) => e.name === i.name && e.facility.type !== "dormitory" && z(e)) || a.some((e) => e.source.name === i.name) || a.push({
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
				let n = je("dormitory", t.level), r = s.get(t.id) ?? /* @__PURE__ */ new Set(), i = Array.from({ length: n }, (e, t) => t).find((e) => !r.has(e));
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
			e.current && u.add(e.current), f.push(Jn(n, e.current ?? e.source, e.dormitory, e.slotIndex, e.startMood, t));
		});
		try {
			n.placements = [...c.filter((e) => !u.has(e)), ...f], n.active = Tn(n, t);
			let i = /* @__PURE__ */ new Map();
			n.placements.filter((e) => e.facility.type === "dormitory").forEach((t) => i.set(t.name, Wn(e, r, t.name))), a.forEach((e) => {
				if (!e.dormitory || e.slotIndex === void 0) return;
				let r = e.restPlacement ?? f.find((t) => t.name === e.source.name);
				if (!r) return;
				let a = n.placements.filter((t) => t.facility.id === e.dormitory?.id), o = qn(n, e.dormitory, r, a, i, t), s = Math.min(e.expectedMood, F(e.startMood + o * n.durationHours));
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
function Xn(e, t) {
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
	}, i = (e, t) => n(e, (e) => e.name === t.name), a = Bn(e);
	e.forEach((e) => {
		e.placements.forEach((t) => {
			t.fiammettaForced = Vn(e, t, a);
		});
	});
	let o = new Set(e.flatMap((e) => e.placements.filter((e) => e.fiammettaForced).map((e) => e.name))), s = new Set(e.length > 1 ? e[0]?.placements.map((e) => e.name).filter((n) => !o.has(n) && e.every((e) => {
		let r = e.placements.find((e) => e.name === n);
		return !!r && R(r, t) && !r.explicitMood;
	})).filter((t) => e.some((e) => {
		let n = e.placements.find((e) => e.name === t);
		return !!n && L(n);
	})) : []), c = /* @__PURE__ */ new Map(), l = (e, n) => !!e && R(e, t) && R(n, t), u = (e, t) => !!e && z(e) && e.moodEnd > 1e-6 && L(e) && L(t) && (!t.explicitMood || F(t.state.mood ?? 24) > 1e-6);
	e.forEach((e, t) => {
		e.placements.forEach((e) => {
			let n = i(t, e).placement, a = l(n, e), o = r(t, e), s = o.placement, d = u(s, e), f = c.get(e.name);
			e.moodStart = e.fiammettaForced ? 24 : e.explicitMood ? F(e.state.mood ?? 24) : f === void 0 ? a ? n.moodEnd : 24 : f, e.working = !0, e.workHoursBefore = d ? s.workHoursBefore + (o.context?.durationHours ?? 0) : 0, e.moodEnd = e.moodStart;
		});
	});
	for (let n = 0; n < 16; n += 1) {
		let a = 0, o = 0;
		if (e.forEach((e, n) => {
			e.placements.forEach((e) => {
				let t = i(n, e).placement, o = l(t, e), s = r(n, e), d = s.placement, f = u(d, e), p = c.get(e.name), m = e.fiammettaForced ? 24 : e.explicitMood ? F(e.state.mood ?? 24) : p === void 0 ? o ? t.moodEnd : 24 : p;
				a = Math.max(a, Math.abs(m - e.moodStart)), e.moodStart = m, e.working = !0, e.workHoursBefore = f ? d.workHoursBefore + (s.context?.durationHours ?? 0) : 0;
			});
			let s = {
				capBoosts: {},
				bonusByFacility: {}
			};
			e.active = Tn(e, t, !0);
			let d = Nn(e, e.active, t, s);
			e.basePoints = d.points, e.basePointDetails = d.details, e.statValues = Pn(e, e.active, t), e.active = Tn(e, t, !1);
			let f = Nn(e, e.active, t, s);
			e.basePoints = f.points, e.basePointDetails = f.details, e.placements.forEach((n) => {
				let r = Fn(e, n, t, s);
				n.costRate = r.rate, n.moodRateDetails = r.details;
				let i = L(n) ? F(n.moodStart - n.costRate * e.durationHours) : n.moodStart;
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
			let r = i(n, e).placement, a = F(e.state.mood ?? 24);
			return !r || !R(r, t) || !R(e, t) || r.moodEnd >= a ? [] : [{
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
	let d = Un(e, t);
	return Yn(e, t), d;
}
function W(e, t, n = A) {
	return !e.recipe || !t.product ? !e.recipe : j(t.product, t.sourceMaterial, n)?.recipe === e.recipe;
}
function Zn() {
	return {
		capBoosts: {},
		bonusByFacility: {}
	};
}
function Qn(e, t, n, r, i) {
	return H(e) ? fn(e, t, n, r, i, n.durationHours) : U(e, t, n, r, i);
}
function $n(e, t, n, r) {
	let i = Zn(), a = I(e.document, e.index, t), o = t.type === "trading" ? e.ruleset.tradeOrderLimitByLevel[t.level] ?? 0 : 0, s = t.type === "manufacture" ? e.ruleset.manufactureStorageByLevel[t.level] ?? 0 : 0, c = {
		orderLimit: 0,
		storageCap: 0
	}, l = {
		orderLimit: {},
		storageCap: {}
	}, u = tr(e, t);
	r.filter((e) => e.target?.id === t.id && ht.has(e.effect.stat)).filter((e) => !u.has(e.skill)).filter((e) => e.effect.per?.source !== "stat" && e.effect.per?.source !== "facCap" && e.effect.per?.source !== "capTier").filter((t) => W(t.effect, a, e.ruleset)).forEach((r) => {
		let a = Qn(r, t, e, n, i);
		c[r.effect.stat] = (c[r.effect.stat] ?? 0) + a;
		let o = l[r.effect.stat] ?? (l[r.effect.stat] = {});
		o[r.owner.name] = (o[r.owner.name] ?? 0) + a;
	});
	let d = {
		capBoosts: l,
		bonusByFacility: {}
	};
	r.filter((e) => e.target?.id === t.id && ht.has(e.effect.stat)).filter((e) => !u.has(e.skill)).filter((e) => ["facCap", "capTier"].includes(e.effect.per?.source ?? "")).filter((t) => W(t.effect, a, e.ruleset)).forEach((r) => {
		let i = Qn(r, t, e, n, d);
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
function er(e, t) {
	let n = e.active.filter((e) => e.target?.id === t.id && e.effect.stat === "zeroOpBonus"), r = new Set(n.map((e) => e.owner.name));
	return r.size === 0 ? vt : {
		operators: new Set(e.active.filter((e) => e.target?.id === t.id && !r.has(e.owner.name)).map((e) => e.owner.name)),
		exceptSources: new Set(n.flatMap((e) => e.effect.except ?? []))
	};
}
function tr(e, t) {
	return new Set(e.active.filter((e) => e.target?.id === t.id).flatMap((e) => e.effect.suppresses ?? []));
}
function nr(e) {
	return e.effect.stack === "max" && pt.has(e.effect.stat);
}
function rr(e, t) {
	let n = e.effect.per?.source;
	return Vt(e) || typeof n == "string" && t.has(n);
}
function ir(e, t) {
	return !t.operators.has(e.owner.name) || rr(e, t.exceptSources);
}
function G(e, t, n, r, i, a, o, s = "all", c = "regular", l) {
	let u = tr(e, t), d = (r) => {
		let a = l === void 0 ? U(r, t, e, n, i) : bn(r, t, e, n, i, l), o = l === void 0 ? _n(r, t, e, n, i) : void 0;
		return {
			item: r,
			value: a,
			...o ? { calculation: o } : {}
		};
	}, f = (e) => {
		let t = Vt(e);
		return s === "all" || (s === "base" ? t : !t);
	}, p = (e) => c === "stat" ? e.effect.per?.source === "stat" : e.effect.per?.source !== "stat" && e.effect.per?.source !== "orderCount", m = [];
	r.filter((e) => e.target?.id === t.id && o.has(e.effect.stat)).filter(f).filter((n) => W(n.effect, I(e.document, e.index, t), e.ruleset)).filter((e) => e.effect.stat !== "tradeNetEff").filter(p).filter((e) => !["moodCost", "moodRecover"].includes(e.effect.stat)).filter((e) => e.effect.stack !== "max").filter((e) => !u.has(e.skill)).filter((e) => ir(e, a)).forEach((e) => m.push(d(e)));
	let h = /* @__PURE__ */ new Map();
	r.filter((e) => e.target?.id === t.id && o.has(e.effect.stat)).filter(f).filter((n) => W(n.effect, I(e.document, e.index, t), e.ruleset)).filter(p).filter((e) => e.effect.stack === "max").filter((e) => e.effect.stat !== "tradeNetEff").filter((e) => !u.has(e.skill)).filter((e) => ir(e, a)).forEach((e) => {
		let t = e.effect.maxGroup ?? `${e.effect.target}|${e.effect.stat}|${e.effect.recipe ?? ""}`, n = h.get(t) ?? /* @__PURE__ */ new Map(), r = n.get(e.owner.name) ?? [];
		r.push(d(e)), n.set(e.owner.name, r), h.set(t, n);
	});
	let g = m.reduce((e, t) => e + t.value, 0), _ = [...m];
	return h.forEach((e) => {
		let t = "", n = -Infinity;
		e.forEach((e, r) => {
			let i = e.reduce((e, t) => e + t.value, 0);
			i > n && (t = r, n = i);
		}), t && Number.isFinite(n) && (g += n, _.push(...e.get(t) ?? []));
	}), {
		total: g,
		details: _
	};
}
function ar(e, t, n, r, i, a) {
	let o = {};
	return e.facilities.forEach((s) => {
		let c = r.get(s.id), l = {
			capBoosts: n.get(s.id)?.capBoosts ?? {},
			bonusByFacility: o,
			...c ? { capacitySegments: c.segments } : {}
		}, u = er(e, s), d = /* @__PURE__ */ new Set([
			"tradeSpd",
			"manuProd",
			"clueSpeed",
			"hireSpd",
			"droneCharge",
			"abyssalBoost"
		]), f = G(e, s, t, e.active.filter((e) => e.target?.id === s.id && (i === "targetFacility" || e.owner.facility.id === s.id) && !["facilityCount", "powerCount"].includes(e.effect.per?.source ?? "")), l, u, d, "combination", "regular", a), p = {};
		function m(e, t) {
			if (e.effect.excludeFromStat) return;
			let n = e.effect.stat === "tradeNetEff" || e.effect.stat === "tradeGapEff" ? "tradeSpd" : e.effect.stat, r = p[e.owner.name] ?? (p[e.owner.name] = {});
			r[n] = (r[n] ?? 0) + t;
		}
		if (f.details.forEach(({ item: e, value: t }) => m(e, t)), i === "targetFacility" && s.type === "trading") {
			let r = n.get(s.id);
			r && lr(e, s, t, r, e.active, l, u, f.total, 0).details.forEach(({ item: e, value: t }) => m(e, t));
		}
		o[s.id] = p;
	}), o;
}
function or(e, t) {
	let n = e.durationHours, r = [0, n];
	return e.active.filter((e) => P.has(e.effect.stat)).forEach((e) => {
		if (e.effect.curve) for (let e = 1; e < n - M; e += 1) r.push(e);
		e.effect.condition?.type === "workHours" && r.push(Number(e.effect.condition.value ?? 0) - e.owner.workHoursBefore), H(e) && r.push(...pn(e, n));
	}), t.forEach(({ segments: e }) => {
		e.forEach(({ startHours: e, endHours: t }) => {
			r.push(e, t);
		});
	}), Array.from(new Set(r.map((e) => Math.max(0, Math.min(n, e))).sort((e, t) => e - t)));
}
function sr(e, t, n, r) {
	if (!e.active.some((e) => e.effect.per?.source === "stat")) return;
	let i = or(e, r), a = [];
	for (let o = 1; o < i.length; o += 1) {
		let s = i[o - 1] ?? 0, c = i[o] ?? s;
		if (c <= s + 1e-6) continue;
		let l = (s + c) / 2;
		a.push({
			startHours: s,
			endHours: c,
			bonusByFacility: ar(e, t, n, r, "targetFacility", l),
			sameFacilityBonusByFacility: ar(e, t, n, r, "sameFacility", l)
		});
	}
	return a;
}
function cr(e, t) {
	let n = /* @__PURE__ */ new Map();
	return e.facilities.forEach((r) => {
		n.set(r.id, $n(e, r, t, e.active));
	}), n;
}
function lr(e, t, n, r, i, a, o, s, c) {
	if (t.type !== "trading") return {
		value: 0,
		orderLimitNet: r.rawOrderLimit,
		details: []
	};
	let l = tr(e, t), u = i.filter((e) => e.target?.id === t.id && !l.has(e.skill) && e.effect.stat === "orderLimit" && e.effect.per?.source === "stat"), d = i.filter((e) => e.target?.id === t.id && e.effect.stat === "tradeNetEff").filter((e) => !l.has(e.skill)).filter((e) => ir(e, o)), f = i.filter((e) => e.target?.id === t.id && !l.has(e.skill) && e.effect.stat === "tradeSpd" && e.effect.per?.source === "orderCount").filter((e) => ir(e, o)), p = i.filter((e) => e.target?.id === t.id && !l.has(e.skill) && e.effect.stat === "tradeGapEff").filter((e) => ir(e, o)), m = e.ruleset.tradeOrderLimitByLevel[t.level] ?? 0;
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
		let i = U(r, t, e, n, {
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
		let a = f.length > 0 ? g : Math.max(1, m + r.rawOrderLimit), o = p.map((e) => a * Number(e.effect.value ?? 0)), s = o.reduce((e, t) => e + t, 0), l = c + v + s, u = e.settings.preferMaxJieEfficiency !== !1, d = (u ? void 0 : hr(e, t, 100, n, i))?.orders ?? [], h = d.reduce((e, t) => e + t.probability * t.time, 0), y = d.length === 1 && d[0]?.ignoreEfficiency ? "fixedOrder" : d.length === 0 || h <= 1e-6 ? "missingOrders" : void 0, b = !u && !y && e.durationHours > 1e-6, x = l, S = 0, ee = St(e.settings, t.id), C = p.reduce((e, t) => e + Number(t.effect.value ?? 0), 0), w = f.reduce((e, t) => e + Number(t.effect.per?.value ?? t.effect.value ?? 0), 0), T = C - w;
		if (b) {
			let t = 0, n = l, r = 0;
			for (; t < e.durationHours - 1e-6 && n > 1e-6;) {
				let i = S === 0 ? 1 - ee : 1, a = h / (n / 100) * i;
				if (a <= 1e-6) {
					S += 1, n -= T;
					continue;
				}
				if (t + a > e.durationHours + 1e-6) break;
				r += n * a, t += a, S += 1, n -= T;
			}
			x = (r + Math.max(0, n) * Math.max(0, e.durationHours - t)) / e.durationHours;
		}
		let te = b ? x - c - v : s, ne = {
			type: "tradeGap",
			mode: b ? "integral" : "max",
			durationHours: e.durationHours,
			gapBase: a,
			gapValue: s,
			initialEfficiency: l,
			averageEfficiency: b ? x : l,
			...b || y ? { expectedOrderHours: h } : {},
			firstItemProgress: ee,
			completedOrders: S,
			decrement: T,
			orderIncrement: w,
			...y ? { fallbackReason: y } : {}
		};
		p.forEach((e, t) => {
			let n = o[t] ?? 0, r = Math.abs(s) > 1e-6 ? n / s : 0;
			_.push({
				item: e,
				value: b ? te * r : n,
				calculation: ne
			});
		}), v += b ? te : s;
	}
	return {
		value: v,
		orderLimitNet: g,
		details: _
	};
}
function ur(e, t, n, r) {
	return e.details.map(({ item: e, value: t, calculation: n }) => ({
		item: e,
		value: t,
		calculation: n ?? xn(e, r)
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
function dr(e, t) {
	if (e.type === "meeting") return z(t) ? 5 : 0;
	if (e.type === "power" || e.type === "hire" || e.type === "trading" || e.type === "manufacture") {
		let n = e.type === "trading" || e.type === "manufacture" ? 1 : 5;
		return z(t) ? n : 0;
	}
	return 0;
}
function fr(e) {
	return Je(e.profile?.rarity ?? 0) + Ye(e.state.elite ?? 0);
}
function pr(e, t, n, r, i, a, o, s) {
	let c = Fe(e.document, e.index, t.type, t.index), l = {
		capBoosts: r.capBoosts,
		bonusByFacility: i,
		sameFacilityBonusByFacility: a,
		...o ? { bonusSegments: o } : {},
		...s ? { capacitySegments: s.segments } : {}
	}, u = er(e, t), d = G(e, t, n, e.active, l, vt, /* @__PURE__ */ new Set([...P, "facBase"]), "base"), f = G(e, t, n, e.active, l, u, P, "combination"), p = G(e, t, n, e.active, l, u, P, "combination", "stat"), m = B(e, t), h = m.reduce((e, n) => e + dr(t, n), 0), g = Ge(t.type, t.level, e.ruleset);
	if (t.type === "meeting") {
		let t = e.facilities.filter((e) => e.type === "dormitory").reduce((e, t) => e + t.level * 1e3, 0);
		g += qe(t);
	}
	g += d.total;
	let _ = t.type === "meeting" ? m.map((e) => ({
		operator: e.name,
		stat: "operatorTraining",
		value: fr(e),
		facility: t.type,
		ownerFacility: e.facility.type,
		category: "combination"
	})).filter((e) => Math.abs(e.value) > M) : [], v = _.reduce((e, t) => e + t.value, 0), y = lr(e, t, n, r, e.active, l, u, f.total, g + h + f.total + p.total + v);
	if (t.type === "trading" && r.attributes.orderLimit) {
		let e = r.rawOrderLimit, t = r.linked ? y.orderLimitNet : e;
		r.attributes.orderLimit = {
			base: r.attributes.orderLimit.base,
			skill: t,
			total: Math.max(1, r.attributes.orderLimit.base + t)
		};
	}
	let b = f.total + p.total + y.value + v, x = ur(d, t.type, "base", e), S = [
		...ur(f, t.type, "combination", e),
		...ur(p, t.type, "combination", e),
		...ur(y, t.type, "combination", e),
		..._
	], ee = b, C = [...x, ...S], w = t.type === "meeting" ? kn(e, t) : [], T = {
		facility: t,
		inherited: c.inherited,
		inheritedFromPlanIndex: c.sourcePlanIndex,
		baseEfficiency: g,
		moodEfficiency: h,
		operatorEfficiency: h,
		skillEfficiency: b,
		operatorSkillEfficiency: ee,
		efficiency: g + h + b,
		attributes: r.attributes,
		...w.length > 0 ? { cluePreferences: w } : {},
		details: C,
		baseDetails: x,
		combinationDetails: S
	}, te = gr(e, t, T.efficiency, n, e.active);
	return T.capacity = Sr(e, t, r, n, e.active)?.capacity, T.production = Cr(e, t, te, T.capacity), T.production && w.length > 0 && (T.production.cluePreferences = w), T;
}
function mr(e, t) {
	return e.filter((e) => e.target?.id === t.id && e.effect.stat === "tradeOrder").map((e) => e.effect);
}
function hr(e, t, n, r, i) {
	let a = Bt(r), o = k(I(e.document, e.index, t).product ?? "龙门币");
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
	let s = mr(i, t), c = s.filter((e) => e.order?.type === "fixed").sort((e, t) => Number(e.order?.priority ?? 99) - Number(t.order?.priority ?? 99))[0], l = n / 100;
	if (c?.order) {
		let e = Number(c.order.qty ?? 0) / Number(c.order.time ?? 1), t = e * (c.order.ignoreEff ? 1 : l), n = c.order.material ? k(c.order.material) : null, r = {}, i = {};
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
	let m = s.find((e) => e.order?.type === "fixValues")?.order, h = m ? [] : s.filter((e) => e.order?.type === "breach"), g = m ? [] : s.filter((e) => e.order?.type === "invest"), _ = h.reduce((e, t) => e + Number(t.order?.amount ?? 0), 0), v = h.reduce((e, t) => e + Number(t.order?.qty ?? 0), 0), y = g.reduce((e, t) => e + Number(t.order?.qty ?? 0), 0), b = 0, x = 0, S = 0, ee = [];
	if (u.forEach((e) => {
		let t = h.length > 0 && [2, 3].includes(e.amount), n = m?.qty === void 0 ? Number(e.gold) + (t ? v : 0) + (e.amount === 4 ? y : 0) : Number(m.qty), r = m?.amount === void 0 ? e.amount + (t ? _ : 0) : Number(m.amount), i = [];
		m?.qty !== void 0 && i.push("金额替换"), t && (_ !== 0 || v !== 0) && i.push("违约索赔"), e.amount === 4 && y > 0 && i.push("投资"), b += e.probability * n, x += e.probability * e.hours, S += e.probability * r, ee.push({
			name: e.name,
			probability: e.probability,
			quantity: n,
			time: e.hours,
			material: "赤金",
			amount: r,
			...i.length ? { note: i.join("、") } : {}
		});
	}), x <= 1e-6) return;
	let C = b / x, w = { 赤金: -(S / x) }, T = C * l;
	return {
		product: "龙门币",
		baseAmountPerHour: C,
		baseAmountPerDay: C * 24,
		baseMaterialPerHour: w,
		amountPerHour: T,
		amountPerDay: T * 24,
		itemRate: l / x,
		orderRule: m || h.length || g.length || p ? "龙门商法（含特殊规则）" : "龙门商法",
		orders: ee,
		materialPerHour: Object.fromEntries(Object.entries(w).map(([e, t]) => [e, t * l]))
	};
}
function gr(e, t, n, r, i) {
	let a = I(e.document, e.index, t);
	if (t.type === "trading") return hr(e, t, n, r, i);
	if (t.type === "manufacture") {
		let t = j(a.product, a.sourceMaterial, e.ruleset);
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
function _r(e, t) {
	return [.../* @__PURE__ */ new Set([...Object.keys(e), ...Object.keys(t)])].every((n) => {
		let r = e[n] ?? {}, i = t[n] ?? {};
		return [.../* @__PURE__ */ new Set([...Object.keys(r), ...Object.keys(i)])].every((e) => Math.abs((r[e] ?? 0) - (i[e] ?? 0)) <= M);
	});
}
function vr(e) {
	return Object.fromEntries(Object.entries(e).map(([e, t]) => [e, { ...t }]));
}
function yr(e) {
	return e.map((e) => ({
		startHours: e.startHours,
		endHours: e.endHours,
		base: e.base,
		skill: e.skill,
		total: e.total
	}));
}
function br(e, t, n, r, i, a) {
	let o = I(e.document, e.index, t), s = {
		capBoosts: n.capBoosts,
		bonusByFacility: {}
	}, c = tr(e, t), l = {};
	return {
		skill: r.filter((e) => e.target?.id === t.id && ht.has(e.effect.stat)).filter((e) => !c.has(e.skill)).filter((e) => e.effect.per?.source !== "stat").filter((t) => W(t.effect, o, e.ruleset)).reduce((n, r) => {
			let o = H(r) ? fn(r, t, e, i, s, a) : U(r, t, e, i, s), c = l[r.effect.stat] ?? (l[r.effect.stat] = {});
			return c[r.owner.name] = (c[r.owner.name] ?? 0) + o, n + o;
		}, 0),
		capBoosts: l
	};
}
function xr(e, t, n, r, i, a, o, s = 0) {
	let c = e.durationHours, l = r.filter((n) => n.target?.id === t.id && ht.has(n.effect.stat) && H(n) && n.effect.per?.source !== "stat" && !tr(e, t).has(n.skill) && W(n.effect, I(e.document, e.index, t), e.ruleset));
	if (l.length === 0) return [{
		startHours: 0,
		endHours: c,
		base: a,
		skill: o,
		total: Math.max(s, a + o),
		capBoosts: vr(n.capBoosts)
	}];
	let u = [0, c];
	l.forEach((e) => {
		u.push(...pn(e, c));
	});
	let d = Array.from(new Set(u.map((e) => Math.max(0, Math.min(c, e))).sort((e, t) => e - t))), f = [];
	for (let o = 1; o < d.length; o += 1) {
		let c = d[o - 1] ?? 0, l = d[o] ?? c;
		if (l <= c + 1e-6) continue;
		let u = br(e, t, n, r, i, (c + l) / 2), p = Math.max(s, a + u.skill), m = f[f.length - 1];
		if (m && Math.abs(m.total - p) <= 1e-6 && _r(m.capBoosts, u.capBoosts)) {
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
		capBoosts: vr(n.capBoosts)
	}];
}
function Sr(e, t, n, r, i) {
	let a = n.attributes;
	if (t.type === "trading") {
		let o = a.orderLimit;
		if (!o) return;
		let s = xr(e, t, n, i, r, o.base, o.skill, 1);
		return {
			capacity: {
				label: "订单上限",
				unit: "单",
				base: o.base,
				skill: o.skill,
				total: o.total,
				segments: yr(s)
			},
			segments: s
		};
	}
	if (t.type === "manufacture") {
		let o = a.storageCap;
		if (!o) return;
		let s = I(e.document, e.index, t), c = j(s.product, s.sourceMaterial, e.ruleset), l = xr(e, t, n, i, r, o.base, o.skill), u = i.some((n) => n.target?.id === t.id && ht.has(n.effect.stat) && H(n) && n.effect.per?.source !== "stat" && !tr(e, t).has(n.skill) && W(n.effect, s, e.ruleset)) ? br(e, t, n, i, r, e.durationHours).skill : o.skill;
		return {
			capacity: {
				label: "仓库容量",
				unit: "格",
				base: o.base,
				skill: u,
				total: o.base + u,
				segments: yr(l),
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
				segments: yr(t)
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
				segments: yr(t)
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
				segments: yr(t)
			},
			segments: t
		};
	}
}
function Cr(e, t, n, r) {
	if (!n) return;
	if (!r || !n.itemRate || n.itemRate <= 1e-6) return n;
	let i = n.itemRate, a = St(e.settings, t.id), o = Infinity;
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
	let s = o <= e.durationHours + M;
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
function wr(e) {
	return [
		e.owner.facility.id,
		e.owner.index,
		e.owner.name,
		e.skill,
		e.effect.stat,
		JSON.stringify(e.effect.per ?? e.effect.value ?? null)
	].join("|");
}
function Tr(e, t, n, r, i, a) {
	let o = e.facilities.filter((e) => e.type === "power"), s = o[0];
	if (!s || !Kt(e, "power").length) return;
	let c = Kt(e, "power").filter((e) => z(e)).length * 5, l = /* @__PURE__ */ new Set(), u = /* @__PURE__ */ new Set(), d = 0, f = 0, p = [], m = [];
	o.forEach((o) => {
		let s = {
			capBoosts: n.get(o.id)?.capBoosts ?? {},
			bonusByFacility: r,
			sameFacilityBonusByFacility: i,
			...a ? { bonusSegments: a } : {}
		}, c = G(e, o, t, e.active, s, vt, /* @__PURE__ */ new Set(["droneCharge", "abyssalBoost"]), "combination"), h = G(e, o, t, e.active, s, vt, /* @__PURE__ */ new Set([
			"droneCharge",
			"abyssalBoost",
			"facBase"
		]), "base");
		c.details.forEach(({ item: t, value: n }) => {
			let r = wr(t);
			l.has(r) || (l.add(r), d += n, p.push(...ur({ details: [{
				item: t,
				value: n
			}] }, o.type, "combination", e)));
		}), h.details.forEach(({ item: t, value: n }) => {
			let r = wr(t);
			u.has(r) || (u.add(r), f += n, m.push(...ur({ details: [{
				item: t,
				value: n
			}] }, o.type, "base", e)));
		});
	});
	let h = 100 + f, g = d, _ = h + c + d, v = {
		product: "无人机",
		baseAmountPerHour: e.ruleset.powerOutputPerHour,
		baseAmountPerDay: e.ruleset.powerOutputPerHour * 24,
		amountPerHour: e.ruleset.powerOutputPerHour * _ / 100,
		amountPerDay: e.ruleset.powerOutputPerHour * _ / 100 * 24,
		itemRate: e.ruleset.powerOutputPerHour * _ / 100
	}, y = {
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
	}, b = Cr(e, s, v, y);
	return {
		facility: s,
		baseEfficiency: h,
		moodEfficiency: c,
		operatorEfficiency: c,
		skillEfficiency: d,
		operatorSkillEfficiency: g,
		efficiency: _,
		attributes: {},
		production: b,
		capacity: y,
		details: [...p, ...m],
		baseDetails: m,
		combinationDetails: p
	};
}
function Er(e, t) {
	let n = cr(e, t), r = /* @__PURE__ */ new Map();
	e.facilities.forEach((i) => {
		let a = Sr(e, i, n.get(i.id) ?? {
			attributes: {},
			rawOrderLimit: 0,
			capBoosts: {},
			linked: !1,
			orderLimitNet: 0
		}, t, e.active);
		a && r.set(i.id, a);
	});
	let i = ar(e, t, n, r, "targetFacility"), a = ar(e, t, n, r, "sameFacility"), o = sr(e, t, n, r), s = [], c = Tr(e, t, n, i, a, o);
	return e.facilities.forEach((l) => {
		if (l.type === "control" || l.type === "processing" || l.type === "training" || l.type === "dormitory") return;
		if (l.type === "power") {
			l.index === 0 && c && s.push(c);
			return;
		}
		if (!B(e, l).length) return;
		let u = n.get(l.id) ?? {
			attributes: {},
			rawOrderLimit: 0,
			capBoosts: {},
			linked: !1,
			orderLimitNet: 0
		};
		s.push(pr(e, l, t, u, i, a, o, r.get(l.id)));
	}), {
		name: e.plan.name ?? `队列${e.index + 1}`,
		durationHours: e.durationHours,
		facilities: s,
		moods: e.placements.filter((e) => R(e, t)).map((e) => ({
			operator: e.name,
			facility: e.facility.type,
			facilityId: e.facility.id,
			facilityIndex: e.facility.index,
			slotIndex: e.index,
			start: e.moodStart,
			end: e.moodEnd,
			costRate: e.costRate,
			working: z(e),
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
function Dr(e, t, n) {
	let r = [], i = [];
	return e.plans.forEach((a, o) => {
		let s = a.drones;
		if (!s || s.enable === !1) return;
		let c = s.room, l = s.index, u = c !== void 0 && l !== void 0 ? n.find((e) => e.type === c && e.index === l) : void 0;
		if (!u || !t[o]) {
			r.push({
				code: "invalidTarget",
				message: `${a.name || `队列${o + 1}`}：无人机目标设施无效，未参与无人机计算`
			});
			return;
		}
		let d = s.order === "post" ? o : (o - 1 + e.plans.length) % e.plans.length;
		if (!t[d]?.facilities.some((e) => e.facility.id === u.id && e.production)) {
			r.push({
				code: "noProduction",
				message: `${a.name || `队列${o + 1}`}：无人机目标设施没有有效产出，未参与无人机计算`
			});
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
function Or(e, t) {
	return e.map((e) => {
		let n = e.facilities.find((e) => e.facility.id === t?.id && e.production)?.production;
		return Math.max(0, (n?.effectiveAmountPerHour ?? n?.amountPerHour ?? 0) * e.durationHours);
	});
}
function kr(e) {
	return e.type === "trading" || e.type === "manufacture";
}
function Ar(e, t) {
	let n = t.baseMaterialPerHour ?? t.materialPerHour ?? {}, r = Object.keys(n).sort().map((e) => `${e}:${n[e]}`).join(",");
	return `${e.type}:${t.product}:${t.baseAmountPerHour}:${r}`;
}
function jr(e, t, n, r, i) {
	let a = [], o = /* @__PURE__ */ new Map();
	return n.forEach((n) => {
		let s = e[n.sourcePlanIndex];
		if (!s) return;
		let c = r.get(n.planIndex) ?? 0, l = c * 3 / 60, u = i.get(n.planIndex) ?? 0, d = t.filter(kr).flatMap((e) => {
			let t = s.facilities.find((t) => t.facility.id === e.id)?.production;
			if (!t) return [];
			let r = Ar(e, t), i = o.get(r);
			return i || (i = {
				product: t.product,
				baseAmountPerHour: t.baseAmountPerHour,
				baseMaterialPerHour: t.baseMaterialPerHour ?? t.materialPerHour ?? {}
			}, o.set(r, i)), [{
				planIndex: n.planIndex,
				facilityId: e.id,
				room: e.type,
				facilityIndex: e.index,
				order: n.order,
				sourcePlanIndex: n.sourcePlanIndex,
				sourceDurationHours: s.durationHours,
				product: i.product,
				droneAmount: c,
				acceleratedHours: l,
				baseAmountPerHour: i.baseAmountPerHour,
				baseMaterialPerHour: i.baseMaterialPerHour,
				extraAmount: i.baseAmountPerHour * l,
				extraMaterial: Object.fromEntries(Object.entries(i.baseMaterialPerHour).map(([e, t]) => [e, t * l])),
				overflowed: u > 0,
				overflowAmount: u,
				accelerated: e.id === n.facility.id
			}];
		}).sort((e, t) => Number(t.accelerated) - Number(e.accelerated));
		a.push(...d);
	}), a;
}
function Mr(e, t, n, r) {
	let { targets: i, warnings: a } = Dr(e, t, n);
	if (i.length === 0) return a.length > 0 ? {
		enabled: !1,
		details: [],
		candidates: [],
		warnings: a,
		generatedDrones: 0,
		usedDrones: 0
	} : void 0;
	let o = Or(t, n.find((e) => e.type === "power")), s = [...i].sort((e, t) => e.planIndex - t.planIndex), c = /* @__PURE__ */ new Map(), l = /* @__PURE__ */ new Map();
	s.forEach((n, i) => {
		let u = s[(i - 1 + s.length) % s.length], d = 0, f = u.planIndex, p = s.length === 1, m = 0;
		do {
			if (d += o[f] ?? 0, d > r.droneLimit) {
				let n = d - r.droneLimit;
				l.set(f, Math.max(l.get(f) ?? 0, n)), a.push({
					code: "overflow",
					message: `${t[f]?.name || `队列${f + 1}`}：无人机库存 ${d.toFixed(2)} 架，超过 ${r.droneLimit} 架上限`
				}), e.settings?.droneOverflowMode === "zero" && (d = r.droneLimit);
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
		candidates: jr(t, n, i, c, l),
		warnings: a,
		generatedDrones: o.reduce((e, t) => e + t, 0),
		usedDrones: u.reduce((e, t) => e + t.droneAmount, 0)
	};
}
function Nr(e, t, n) {
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
function Pr(e, t, n = {}) {
	let r = Gt(e, t, n.progressionProfile, n.treatSkillsAsUnlocked, n.dormitoryDefaultIncludesMoodRecovery), i = Xn(r, t), a = r.map((e) => Er(e, t)), o = Mr(e, a, Ue(e.layout), t.ruleset ?? A), s = a.reduce((e, t) => e + t.durationHours, 0), c = Et(a, s);
	o?.enabled && Nr(c, o.details, s);
	let l = Ot(e, c, t.ruleset ?? A);
	if (o) {
		let t = l.filter((e) => e.product !== "无人机");
		return {
			document: e,
			plans: a,
			dailyHours: s,
			dailyFacilities: Tt(a, s),
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
		dailyFacilities: Tt(a, s),
		dailyProductions: c,
		dailyOutputs: l,
		...i ? { fiammetta: i } : {},
		fiammettaWarnings: a.flatMap((e) => e.fiammettaWarnings),
		warnings: a.flatMap((e) => e.warnings),
		...o ? { maaDroneAcceleration: o } : {}
	};
}
function Fr(e) {
	return Array.isArray(e.layout) && e.layout.length > 0 ? {
		document: e,
		layoutSource: "document"
	} : {
		document: {
			...e,
			layout: nt(e.plans)
		},
		layoutSource: "inferred"
	};
}
function Ir(e, t) {
	let n = Fr(e), r = n.document.settings ?? {}, i = {
		...t.catalog,
		ruleset: t.ruleset ?? t.catalog.ruleset ?? A
	}, a = Se(n.document);
	if (a.errors.length > 0) throw new ve(a.errors);
	return {
		...Pr(n.document, i, {
			progressionProfile: r.progressionProfile,
			treatSkillsAsUnlocked: r.treatSkillsAsUnlocked,
			dormitoryDefaultIncludesMoodRecovery: r.dormitoryDefaultIncludesMoodRecovery
		}),
		layoutSource: n.layoutSource
	};
}
//#endregion
//#region src/utils/efficiency/drone.ts
var Lr = [
	"龙门币",
	"合成玉",
	"赤金",
	"中级作战记录",
	"源石碎片"
], Rr = {
	1: "1 但书",
	2: "2 但书",
	3: "3 但书 龙舌兰"
};
function zr(e) {
	let t = Math.min(...e.layout.filter((e) => e.type === "trading").map((e) => e.level));
	return Number.isInteger(t) && t >= 1 && t <= 3 ? t : void 0;
}
function Br(e, t, n) {
	let r = k(t);
	e[r] = (e[r] ?? 0) + n;
}
function Vr(e, t) {
	if (t.operators[e]) return { name: e };
	let n = e.match(/^(.+)([012])$/), r = n?.[1];
	if (r && t.operators[r]) return {
		name: r,
		state: { elite: Number(n[2]) }
	};
}
function Hr(e, t) {
	let n = e.trim();
	if (!n) return {};
	let r = n.split(/\s+/), i = Number(r[0]);
	if (!Number.isInteger(i) || i < 1 || i > 3) return { error: "龙门币策略格式应为“贸易站等级 干员名…”，等级必须是 1 到 3" };
	let a = [], o = {};
	for (let e of r.slice(1)) {
		let n = Vr(e, t);
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
function Ur(e) {
	return Lr.includes(e);
}
function Wr(e) {
	let t = e.baseAmountPerHour;
	if (t <= 0) return;
	let n = e.baseMaterialPerHour ?? {};
	return {
		amountPerHour: t,
		materialPerHour: Object.fromEntries(Object.entries(n).map(([e, t]) => [k(e), t]))
	};
}
function Gr(e, t) {
	return e === "trading" ? k(t.product ?? "龙门币") : t.product ? k(t.product) : void 0;
}
function Kr(e, t, n, r) {
	let i = r.ruleset ?? A, a = Gr(e, t);
	if (e === "trading" && a === "龙门币") return Jr((i.tradeOrdersByLevel[n] ?? i.tradeOrdersByLevel[1] ?? []).map((e) => ({
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
	let o = j(a, t.sourceMaterial, i);
	if (o) return {
		amountPerHour: o.amount / o.hours,
		materialPerHour: Object.fromEntries(Object.entries(o.materials ?? {}).map(([e, t]) => [k(e), -t / o.hours]))
	};
}
function qr(e, t, n) {
	return Ue(e.layout).filter((e) => e.type === "trading" || e.type === "manufacture").flatMap((r) => e.plans.flatMap((i, a) => {
		let o = Fe(e, a, r.type, r.index).assignment, s = Gr(r.type, o);
		if (!s || !Ur(s)) return [];
		let c = t.plans[a]?.facilities.find((e) => e.facility.id === r.id), l = c?.production ? Wr(c.production) : Kr(r.type, o, r.level, n);
		if (!l) return [];
		let u = t.plans[a]?.name ?? i.name;
		return [{
			...l,
			key: `${a}-${r.id}`,
			product: s,
			sourceLabel: `${u || `队列${a + 1}`} · ${O[r.type]}${r.index + 1}`
		}];
	}));
}
function Jr(e) {
	let t = e.reduce((e, t) => e + t.probability * t.time, 0);
	if (t <= 0) return;
	let n = e.reduce((e, t) => e + t.probability * t.quantity, 0), r = e.reduce((e, t) => e + (k(t.material ?? "") === "赤金" ? t.probability * (t.amount ?? 0) : 0), 0);
	return {
		amountPerHour: n / t,
		materialPerHour: { 赤金: -r / t }
	};
}
function Yr(e, t) {
	let n = t.ruleset ?? A;
	if (e.operators.length === 0) return Jr((n.tradeOrdersByLevel[e.level] ?? n.tradeOrdersByLevel[1] ?? []).map((e) => ({
		probability: e.probability,
		quantity: e.gold,
		time: e.hours,
		material: "赤金",
		amount: e.amount
	})));
	let r = Ir({
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
	return r ? Xr(r) : void 0;
}
function Xr(e) {
	return Jr(e.orders ?? []);
}
function Zr(e, t, n) {
	Object.entries(t).forEach(([t, r]) => {
		Br(e, t, r * n);
	});
}
function Qr(e, t, n, r = {}) {
	let i = r.ruleset ? {
		...t,
		ruleset: r.ruleset
	} : t, a = Math.max(0, n.无人机 ?? 0), o = a * 3 / 60, s = e.settings?.lmdDroneStrategy?.trim(), c = zr(e), l = r.lmdDroneStrategies ?? Rr, u = Hr(s || (c ? l[c] ?? "" : ""), i);
	!s && c !== void 0 && u.strategy && u.strategy.level !== c && (u = { error: `${c}级贸易站策略必须以“${c}”开头` });
	let d = qr(e, r.efficiencyResult ?? Ir(e, { catalog: i }), i), f = d.some((e) => e.product === "龙门币") && u.strategy ? Yr(u.strategy, i) : void 0, p = Lr.flatMap((e) => {
		if (e === "龙门币") {
			let t = u.strategy;
			return !f || !t ? [] : [$r("龙门币策略", e, f, a, o)];
		}
		let t = d.find((t) => t.product === e);
		return t ? [$r(t.key, t.product, t, a, o, t.sourceLabel)] : [];
	});
	return {
		dailyDrones: a,
		acceleratedHours: o,
		...u.error ? { strategyError: u.error } : {},
		scenarios: p
	};
}
function $r(e, t, n, r, i, a) {
	let o = { 无人机: -r };
	return Br(o, t, n.amountPerHour * i), Zr(o, n.materialPerHour, i), {
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
function ei(e) {
	let t = Number(e.duration ?? 720);
	return Math.round(t / 60 * 100) / 100;
}
function K(e, t = 2) {
	return e.toLocaleString("zh-CN", {
		maximumFractionDigits: t,
		useGrouping: !1
	});
}
function ti(e) {
	return e < 0 ? `-${K(Math.abs(e))}` : K(e);
}
function ni(e) {
	return `${e >= 0 ? "+" : ""}${K(e)}`;
}
function ri(e) {
	let t = e.calculation;
	if (!t) return [];
	if (t.type === "tradeGap") {
		let e = [`模式：${t.mode === "max" ? "最大效率" : "积分平均"}`, `差值基数：${K(t.gapBase)} × ${K(t.gapValue / Math.max(t.gapBase, 1))}% = ${K(t.gapValue)}%`];
		return t.mode === "integral" && e.push(`期望单耗时：${K(t.expectedOrderHours ?? 0)} 小时，首件进度：${K(t.firstItemProgress * 100)}%`, `完成订单：${K(t.completedOrders)}，每单净变化：${ni(-t.decrement)}%${t.orderIncrement > 0 ? `（订单效率补偿 ${ni(t.orderIncrement)}%）` : ""}`, `整站效率平均：${K(t.averageEfficiency)}%（初始 ${K(t.initialEfficiency)}%）`), t.fallbackReason && e.push(t.fallbackReason === "fixedOrder" ? "固定订单不参与逐单衰减，按最大效率计算" : "没有可用的订单分布，按最大效率计算"), e;
	}
	if (t.type === "stat") {
		let n = t.steps.map((e) => `${ti(e.value)} × ${K(e.endHours - e.startHours)}`).join(" + ");
		return [`逐时段折算：${t.steps.map((e) => `${K(e.startHours)}-${K(e.endHours)} 小时：${ti(e.value)}%`).join("；")}`, t.durationHours > 0 ? `加权平均：(${n}) ÷ ${K(t.durationHours)} = ${ti(e.value)}%` : "加权平均：队列时长为 0，结果为 0%"];
	}
	if (t.type === "workHours") {
		let n = t.durationHours > 0 ? `效率：${K(t.baseValue)}% × ${K(t.activeHours)} ÷ ${K(t.durationHours)} = ${K(e.value)}%` : "效率：队列时长为 0，结果为 0%";
		return [
			`累计工作时长：${K(t.beforeHours)} + ${K(t.durationHours)} = ${K(t.beforeHours + t.durationHours)} 小时（阈值 ${K(t.threshold)} 小时）`,
			`生效时长：max(0, min(${K(t.durationHours)}, ${K(t.beforeHours)} + ${K(t.durationHours)} - ${K(t.threshold)})) = ${K(t.activeHours)} 小时`,
			n
		];
	}
	let n = t.steps.findIndex((e) => e.value >= t.cap), r = n >= 0 ? t.steps.slice(0, n) : t.steps, i = n >= 0 ? t.steps.slice(n).reduce((e, t) => e + t.weight, 0) : 0, a = [...r.map((e) => `${K(e.value)} × ${K(e.weight)}`), ...n >= 0 ? [`${K(t.cap)} × ${K(i)}`] : []].join(" + "), o = t.steps.reduce((e, t) => e + t.value * t.weight, 0), s = t.durationHours > 0 ? o / t.durationHours : 0, c = [
		`累计工作时长：${K(t.beforeHours)} + ${K(t.durationHours)} = ${K(t.beforeHours + t.durationHours)} 小时`,
		`档位公式：min(${K(t.startValue)} + (累计时长 + h - ${K(t.startHours)}) × ${K(t.step)}, ${K(t.cap)})`,
		t.durationHours > 0 ? `加权平均：(${a || "0"}) ÷ ${K(t.durationHours)} = ${K(e.value)}%` : "加权平均：队列时长为 0，结果为 0%"
	];
	if (t.workHours) {
		let n = t.durationHours > 0 ? `效率：${K(s)}% × ${K(t.workHours.activeHours)} ÷ ${K(t.durationHours)} = ${K(e.value)}%` : "效率：队列时长为 0，结果为 0%";
		c.push(`工作时长条件：生效 ${K(t.workHours.activeHours)} 小时 / ${K(t.durationHours)} 小时`, n);
	}
	return c;
}
function ii(e) {
	return ri(e).map((e) => {
		let t = e.indexOf("：");
		return t < 0 ? { value: e } : {
			label: e.slice(0, t + 1),
			value: e.slice(t + 1).trimStart()
		};
	});
}
function ai(e) {
	return K(e);
}
var oi = {
	...Ee,
	线索: "线索",
	无人机: "无人机",
	信用: "信用",
	公开招募标签刷新次数: "公开招募标签刷新次数",
	固源岩: "固源岩",
	装置: "装置"
};
function q(e) {
	let t = k(e);
	return oi[t] ?? t;
}
function si(e) {
	return q(e);
}
function ci(e) {
	return e?.length ? `更容易获得${e.map((e) => typeof e == "number" ? `线索${e}` : e === "unowned" ? "尚未拥有的线索" : "已经拥有的线索").join("、")}` : "";
}
function li(e, t) {
	return t * (e.conversion?.amountPerUnit ?? 1);
}
function ui(e) {
	return e.kind === "base" ? "基础消耗速度" : e.kind === "controlWorkers" ? `控制中枢干员减耗（${e.count ?? 0}人）` : e.kind === "facilityWorkers" ? `同设施干员减耗（${e.count ?? 0}人）` : `${[e.operator, e.skill].filter(Boolean).join(" · ") || "技能"}${e.stat === "moodRecover" ? "恢复" : "消耗"}`;
}
function di(e) {
	let [t, ...n] = e.rateDetails;
	return t ? `${K(t.value)}${n.map((e) => ` ${e.value >= 0 ? "+" : "-"} ${K(Math.abs(e.value))}`).join("")} = ${K(e.costRate)}/小时` : `0 = ${K(e.costRate)}/小时`;
}
var fi = {
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
}, pi = /* @__PURE__ */ new Set([
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
function mi(e) {
	return fi[e] ?? "其他效果";
}
function hi(e, t) {
	return `${ni(t)}${pi.has(e) ? "%" : ""}`;
}
function gi(e) {
	return pi.has(e) ? "%" : "";
}
function _i(e, t = !1) {
	let n = e.baseMaterialPerHour ?? e.materialPerHour ?? {}, r = t ? e.effectiveMaterialPerHour ?? e.materialPerHour ?? {} : e.materialPerHour ?? {};
	return [.../* @__PURE__ */ new Set([...Object.keys(n), ...Object.keys(r)])].map((e) => ({
		material: e,
		amount: r[e] ?? 0,
		baseAmount: n[e] ?? 0
	})).filter(({ amount: e, baseAmount: t }) => Math.abs(e) > 1e-6 || Math.abs(t) > 1e-6);
}
function vi(e) {
	return `${K(e)} 小时`;
}
function yi(e) {
	return e.overflowed === void 0 ? "未启用容量模拟" : e.overflowed ? "计划内会爆仓" : "计划内不爆仓";
}
//#endregion
//#region src/utils/resultPresentation.ts
function bi(e, t) {
	return e.moods.filter((e) => e.working && (e.facilityId === t.facility.id || t.facility.type === "power" && e.facility === "power"));
}
function xi(e) {
	return e.plans.flatMap((e, t) => {
		let n = e.facilities.filter((e) => e.production !== void 0 || e.capacity !== void 0 || e.details.length > 0).map((n) => ({
			plan: e,
			planIndex: t,
			facility: n,
			moods: bi(e, n),
			droneAccelerations: e.droneAccelerations.filter((e) => e.facilityId === n.facility.id)
		})), r = e.moods.filter((e) => e.facility === "control" && e.working);
		return r.length > 0 ? [{
			plan: e,
			planIndex: t,
			moods: r
		}, ...n] : n;
	});
}
function Si(e, t, n = {}) {
	let r = /* @__PURE__ */ new Map();
	return t.forEach((t) => {
		let i = t.facility?.facility.id ?? "control", a = t.facility ? n.facilityLabel?.(t.facility) ?? `${O[t.facility.facility.type]} ${t.facility.facility.index + 1}` : O.control, o = r.get(i);
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
function Ci(e, t) {
	let n = e.time > 0 ? e.quantity / e.time : 0, r = e.ignoreEfficiency ? 1 : t / 100;
	return {
		name: e.name,
		probability: e.probability,
		baseRate: n,
		totalRate: n * r,
		...e.ignoreEfficiency ? { ignoreEfficiency: !0 } : {}
	};
}
function wi(e, t, n) {
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
function Ti(e, t) {
	t.forEach((t) => {
		let n = e.find((e) => e.material === t.material);
		n ? (n.baseAmountPerHour += t.baseAmountPerHour, n.dailyAmount += t.dailyAmount, n.queueTotal += t.queueTotal) : e.push({ ...t });
	});
}
function Ei(e, t, n = {}) {
	return e.dailyHours <= 0 ? [] : e.plans.map((r, i) => {
		let a = /* @__PURE__ */ new Map(), o = {};
		return r.facilities.forEach((t) => {
			let i = t.production;
			if (!i) return;
			Lt(o, i, r.durationHours);
			let s = i.baseAmountPerHour, c = i.amountPerHour, l = i.effectiveAmountPerHour ?? c, u = wi(i, r.durationHours, e.dailyHours), d = a.get(i.product) ?? {
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
			Ti(d.materials, u), d.baseEfficiency += t.baseEfficiency, d.totalEfficiency += t.efficiency, d.baseOutputPerHour += s, d.totalOutputPerHour += c, d.selectedOutputPerHour += l, d.queueTotal += l * r.durationHours, d.facilities.push({
				label: n.facilityLabel?.(t) ?? `${O[t.facility.type]} ${t.facility.index + 1}`,
				baseEfficiency: t.baseEfficiency,
				totalEfficiency: t.efficiency,
				baseOutputPerHour: s,
				totalOutputPerHour: c,
				selectedOutputPerHour: l,
				materials: u,
				orders: (i.orders ?? []).map((e) => Ci(e, t.efficiency))
			}), a.set(i.product, d);
		}), {
			plan: r,
			planIndex: i,
			products: Array.from(a.values()).map((t) => ({
				...t,
				dailyContribution: t.selectedOutputPerHour * r.durationHours * 24 / e.dailyHours
			})),
			sanity: Rt(Object.fromEntries(Object.entries(o).map(([t, n]) => [t, n * 24 / e.dailyHours])), t)
		};
	}).filter((e) => e.products.length > 0);
}
function Di(e) {
	let t = {};
	e.dailyProductions.forEach((n) => {
		e.maaDroneAcceleration?.enabled && n.product === "无人机" || Lt(t, n, 24);
	});
	let n = e.dailyOutputs.find((e) => e.product === "信用");
	return n && (t.信用 = n.amountPerDay), t;
}
function Oi(e) {
	if (e === "赤金") return {
		factor: 500,
		label: "赤金点数"
	};
	if (e === "中级作战记录") return {
		factor: 1e3,
		label: "经验点数"
	};
}
function ki(e, t) {
	return e[t] ?? 0;
}
function Ai(e, t, n, r, i) {
	let a = Oi(e), o = n?.items.find((t) => t.resource === e), s = t[e] ?? r ?? 0, c = a?.label ?? o?.amountUnit ?? q(e), l = s * (a?.factor ?? 1), u = o?.contribution ?? (n?.complete ? 0 : void 0), d = r === void 0 || !a ? void 0 : r * a.factor;
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
function ji(e, t, n, r = {}) {
	let i = e.dailyOutputs.filter((e) => e.kind === "production"), a = new Set(i.map((e) => e.product));
	return [...i.map((e) => Ai(e.product, t, n, e.amountPerDay, r.sourceFacilityForProduct?.(e.product))), ...e.dailyOutputs.filter((e) => e.kind === "net" && !a.has(e.product)).map((e) => Ai(e.product, t, n, void 0, r.sourceFacilityForProduct?.(e.product)))];
}
function Mi(e, t) {
	Object.entries(t).forEach(([t, n]) => {
		if (n !== void 0) {
			let r = e;
			r[t] = (r[t] ?? 0) + n;
		}
	});
}
function Ni(e, t) {
	let n = { ...t }, r = e.maaDroneAcceleration;
	return !r?.enabled || e.dailyHours <= 0 || r.details.forEach((t) => {
		Mi(n, {
			[t.product]: -t.extraAmount * 24 / e.dailyHours,
			...Object.fromEntries(Object.entries(t.extraMaterial).map(([t, n]) => [t, -n * 24 / e.dailyHours]))
		});
	}), n;
}
function Pi(e, ...t) {
	let n = /* @__PURE__ */ new Set([e]);
	return t.forEach((e) => {
		Object.entries(e).forEach(([e, t]) => {
			t !== void 0 && Math.abs(t) > 1e-6 && n.add(e);
		});
	}), [...n];
}
function Fi(e, t, n, r, i) {
	return r.filter((n) => n !== "无人机" && (n === e || Math.abs(ki(t, n)) > 1e-6)).map((r) => Ai(r, t, void 0, r === e ? n : void 0, i?.(r)));
}
function Ii(e, t, n, r = {}) {
	return e.dailyHours <= 0 ? [] : t.scenarios.map((t) => {
		let i = e.dailyProductions.find((e) => e.product === t.product), a = i ? (i.effectiveAmountPerDay ?? i.amountPerDay) - (e.maaDroneAcceleration?.details.filter((e) => e.product === t.product).reduce((t, n) => t + n.extraAmount * 24 / e.dailyHours, 0) ?? 0) : 0, o = Ni(e, n);
		Mi(o, t.extraFlow);
		let s = Pi(t.product, t.extraFlow), c = ki(t.extraFlow, t.product);
		return {
			scenario: t,
			views: [{
				key: "extra",
				label: "无人机额外产出与消耗",
				cards: Fi(t.product, t.extraFlow, c, s, r.sourceFacilityForProduct)
			}, {
				key: "accelerated",
				label: "全部无人机加速后",
				cards: Fi(t.product, o, a + c, s, r.sourceFacilityForProduct)
			}]
		};
	});
}
function Li(e, t) {
	let n = (e) => e.basePointDetails.filter((e) => !t || t.has(e.term));
	return e.plans.some((e) => n(e).length > 0) ? e.plans.map((e, t) => ({
		plan: e,
		planIndex: t,
		points: n(e)
	})) : [];
}
function Ri(e) {
	let t = e.maaDroneAcceleration?.details ?? [], n = e.maaDroneAcceleration?.candidates ?? [];
	return e.plans.map((e, r) => ({
		plan: e,
		planIndex: r,
		details: t.filter((e) => e.planIndex === r),
		candidates: n.filter((e) => e.planIndex === r)
	}));
}
function zi(e, t) {
	let { facility: n } = e;
	if (n.type === "power") return O[n.type];
	let r = t.filter((e) => e.type === n.type).length;
	return `${O[n.type]}${r > 1 ? ` ${n.index + 1}` : ""}`;
}
function Bi(e, t) {
	let n = [e.operator, e.skill].filter(Boolean).join(" · "), r = O[e.facility] ?? e.facility;
	return e.kind === "convert" && e.from ? `${n}（${r}，由${t[e.from]?.name ?? e.from} × ${K(e.rate ?? 0)}派生）` : `${n}（${r}）`;
}
function Vi(e, t) {
	return t[e]?.name ?? e;
}
function Hi(e, t) {
	return !e.inherited || e.inheritedFromPlanIndex === void 0 ? "" : `继承自 ${t[e.inheritedFromPlanIndex]?.name || `队列${e.inheritedFromPlanIndex + 1}`}`;
}
function Ui(e, t) {
	return e === "信用" ? "meeting" : t.dailyFacilities.find((t) => t.production?.product === e)?.facility.type;
}
function Wi(e, t) {
	let n = t.dailyAmounts ?? Di(e), r = Rt(n, t.sanityValues), i = xi(e), a = {
		sourceFacilityForProduct: t.sourceFacilityForProduct,
		facilityLabel: t.facilityLabel
	};
	return {
		calculationSteps: i,
		calculationStepGroups: Si(e, i, a),
		dailyOutputQueueDetails: Ei(e, t.sanityValues, a),
		dailySanityAmounts: n,
		dailySanityResult: r,
		dailyOutputCards: ji(e, n, r, a),
		droneScenarioDisplays: t.droneAcceleration ? Ii(e, t.droneAcceleration, n, a) : [],
		basePointQueueDetails: Li(e, t.visibleBasePointTerms),
		maaDroneQueueDetails: Ri(e)
	};
}
//#endregion
//#region src/utils/notices.ts
function Gi(e) {
	let t = [], n = e.document, r = n?.layout?.reduce((e, t) => {
		let n = Me(t.type, t.level);
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
	let i = n ? Se(n) : void 0;
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
	a.layoutSource === "inferred" && t.push({
		code: "layout-inferred",
		level: "info",
		message: "本次计算使用了推测布局",
		details: ["排班表未包含布局，已按队列中的设施自动推测"]
	});
	let o = a.maaDroneAcceleration?.warnings ?? [], s = o.filter((e) => e.code === "overflow").map((e) => e.message);
	s.length > 0 && t.push({
		code: "maa-drone-overflow",
		level: "info",
		message: "发现无人机爆仓风险",
		details: s
	});
	let c = o.filter((e) => e.code !== "overflow").map((e) => e.message);
	c.length > 0 && t.push({
		code: "maa-drone-target",
		level: "warning",
		message: "无人机加速目标无效",
		details: c
	}), a.warnings.length > 0 && t.push({
		code: "missing-skill-data",
		level: "error",
		message: "找不到干员技能数据",
		details: a.warnings
	});
	let l = a.plans.flatMap((e, t) => e.moodWarnings.map((n) => `${e.name || `队列${t + 1}`} · ${O[n.facility]} ${n.facilityIndex + 1} · ${n.operator}：上一队列结束心情 ${K(n.previousEnd)}，当前手动设置为 ${K(n.configuredStart)}`));
	l.length > 0 && t.push({
		code: "mood-inheritance",
		level: "warning",
		message: "发现心情继承异常",
		details: l
	});
	let u = a.plans.flatMap((e, t) => e.moods.filter((e) => e.working && e.start > 0 && e.end === 0).map((n) => `${e.name || `队列${t + 1}`} · ${O[n.facility]} ${n.facilityIndex + 1} · ${n.operator}：工作后心情从 ${K(n.start)} 降至 0`));
	u.length > 0 && t.push({
		code: "mood-work-zero",
		level: "warning",
		message: "有干员在工作后心情降至 0",
		details: u
	});
	let d = a.plans.flatMap((e, t) => e.autoRestWarnings.map((n) => {
		let r = n.facilityIndex === void 0 ? "" : ` · 宿舍 ${n.facilityIndex + 1}`, i = n.reason === "no-space" ? `休整前心情 ${K(n.startMood)}` : `休整后心情 ${K(n.endMood)}，低于下次工作预期 ${K(n.expectedMood)}（休整前 ${K(n.startMood)}）`;
		return {
			detail: `${e.name || `队列${t + 1}`} · ${n.operator}${r}：${i}`,
			reason: n.reason
		};
	})), f = d.filter((e) => e.reason === "no-space").map((e) => e.detail);
	f.length > 0 && t.push({
		code: "mood-auto-rest-no-space",
		level: "info",
		message: "宿舍槽位不足，无法自动休整",
		details: f
	});
	let p = d.filter((e) => e.reason === "not-recovered").map((e) => e.detail);
	if (p.length > 0 && t.push({
		code: "mood-auto-rest-not-recovered",
		level: "info",
		message: "自动休整后心情未达到预期",
		details: p
	}), a.fiammettaWarnings.length > 0) {
		let e = a.fiammetta?.mode === "direct";
		t.push({
			code: "fiammetta-mood",
			level: "warning",
			message: e ? "菲亚梅塔无法完全恢复这些干员心情" : "发现菲亚梅塔心情恢复异常",
			details: e ? [] : a.fiammettaWarnings
		});
	}
	let m = a.plans.flatMap((e, t) => e.facilities.flatMap((r) => {
		let i = r.production;
		if (!i?.overflowed || i.breachTime === void 0) return [];
		let a = r.facility.type === "power" ? e.moods.filter((e) => e.facility === "power").map((e) => e.operator) : e.moods.filter((e) => e.facilityId === r.facility.id).map((e) => e.operator), o = i.breachTime <= 0 ? "将立即爆仓" : `将在工作 ${vi(i.breachTime)}后爆仓`;
		return [`${e.name || `队列${t + 1}`} · ${zi(r, n?.layout ?? [])} · ${a.join("、") || "无干员"}：${o}`];
	}));
	return m.length > 0 && t.push({
		code: "overflow-risk",
		level: "info",
		message: "发现爆仓风险",
		details: m
	}), t;
}
function Ki(e) {
	let t = e.plans.flatMap((t, n) => Ce.flatMap((r) => {
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
			return `${e.planName} · ${O[e.type]} ${e.index + 1}${n}`;
		}),
		closable: !0
	};
}
//#endregion
//#region src/utils/resultDisplay.ts
var qi = "gross-points", Ji = "net", Yi = "net-resource", Xi = "sanity", Zi = "sanity-missing";
function Qi(e) {
	let t = "", n = [];
	for (let r of e) {
		if (typeof r == "string") {
			t += r;
			continue;
		}
		if ("text" in r) {
			t += r.text;
			continue;
		}
		t += `{${n.length}}`, n.push({
			value: r.value,
			...r.format === "signed" ? { signed: !0 } : {}
		});
	}
	return n.length === 0 ? { template: t } : {
		template: t,
		raws: n
	};
}
function $i(e) {
	return e.signed === !0 ? ni(e.value) : K(e.value);
}
function J(e, t = $i) {
	let n = e.raws;
	return n === void 0 || n.length === 0 ? e.template : e.template.replace(/\{(\d+)\}/g, (e, r) => {
		let i = n[Number(r)];
		return i === void 0 ? e : t(i, Number(r));
	});
}
function Y(...e) {
	return Qi(e);
}
function X(e) {
	return { template: e };
}
function ea(e, t = "number") {
	return Qi([{
		value: e,
		format: t
	}]);
}
function Z(e, t, n) {
	return Qi([{
		value: e,
		format: t
	}, n]);
}
function Q(e, t = "number", n) {
	return n === void 0 ? {
		value: e,
		format: t
	} : {
		value: e,
		format: t,
		unit: n
	};
}
function ta(e) {
	return {
		text: e,
		muted: !0
	};
}
function na(e, t = "number", n) {
	return {
		value: e,
		format: t,
		...n === void 0 ? {} : { unit: n },
		muted: !0
	};
}
function $(e, t, n) {
	return {
		key: e,
		...t === void 0 ? {} : { label: t },
		value: n
	};
}
function ra(e, t, n, r) {
	return {
		key: e,
		...t === void 0 ? {} : { label: t },
		rows: n,
		...r === void 0 ? {} : { sections: r }
	};
}
function ia(e, t) {
	return e.name || `队列${t + 1}`;
}
function aa(e) {
	return Y(" · ", Q(e, "number", "小时"), " 小时");
}
function oa(e, t) {
	let n = e.facility;
	return n ? Hi(n, t.plans) : "";
}
function sa(e, t) {
	return Y(" · ", Q(t.durationHours, "number", "小时"), " 小时", ...e.inheritedLabel ? ["· ", e.inheritedLabel] : []);
}
function ca(e, t, n) {
	let r = [];
	return e.grossPoints !== void 0 && e.grossPointsLabel !== void 0 && r.push({
		key: qi,
		value: Y(Q(e.grossPoints, "production", e.grossPointsLabel), ` ${e.grossPointsLabel}`)
	}), e.showNet && r.push({
		key: Ji,
		value: Y("净收入 ", Q(e.netAmount, "signed", e.netUnit), ` ${e.netUnit}`)
	}), r.push(...t), n && r.push(e.netContribution === void 0 ? {
		key: Zi,
		value: X("未计入")
	} : {
		key: Xi,
		value: Y(Q(e.netContribution, "signed", "理智"), " 理智")
	}), r;
}
function la(e, t, n, r = []) {
	let i = t.grossAmount;
	return {
		key: e,
		product: t.product,
		...t.sourceFacility === void 0 ? {} : { sourceFacility: t.sourceFacility },
		main: ea(i ?? t.netAmount, i === void 0 ? "signed" : "production"),
		lines: ca(t, r, n)
	};
}
function ua(e, t) {
	let n = e.dailyHours > 0 ? t.dailyAmounts ?? Di(e) : void 0, r = n ? Rt(n, t.sanityValues) : void 0, i = n && r ? ji(e, n, r, { sourceFacilityForProduct: t.sourceFacilityForProduct }) : [];
	return {
		key: "daily-output",
		label: "每日产出",
		cycleHours: Y(Q(e.dailyHours, "number", "小时"), " 小时"),
		tiles: i.map((e) => la(`daily-${e.product}`, e, !0)),
		...r ? { totalTile: {
			key: "daily-sanity-total",
			product: "理智",
			main: ea(r.total, "signed"),
			lines: []
		} } : {},
		empty: "当前排班没有可统计的产出",
		...r && !r.complete ? { warning: `总理智不完整：未设置${r.missing.join("、")}价值` } : {}
	};
}
function da(e) {
	return {
		label: "无人机使用策略",
		inputLabel: "本排班表专用策略（可选）",
		placeholder: "留空时按通用设置自动选择",
		hint: "输入一行：贸易站等级，后接干员；干员名末尾的 0、1、2 表示精 0、精 1、精 2。留空时按通用设置中的最低贸易站等级自动选择。",
		empty: "未设置有效的龙门币贸易站策略",
		...e.droneAcceleration?.strategyError === void 0 ? {} : { strategyError: e.droneAcceleration.strategyError }
	};
}
function fa(e, t) {
	let n = t.droneAcceleration;
	return n ? Ii(e, n, t.dailyAmounts ?? Di(e), { sourceFacilityForProduct: t.sourceFacilityForProduct }).map((e) => {
		let t = e.scenario;
		return {
			key: t.key,
			title: Y(q(t.product), ...t.sourceLabel ? [" · ", t.sourceLabel] : []),
			meta: Y(Q(t.droneAmount, "number", "架"), "架 · ", Q(t.acceleratedHours, "number", "小时"), "小时"),
			baseRate: Y("基础 ", Q(t.baseAmountPerHour, "production", "/小时"), "/小时"),
			views: e.views.map((e) => ({
				key: e.key,
				label: e.label,
				tiles: e.cards.map((n) => la(`${e.key}-${n.product}`, n, !1, e.key === "accelerated" && n.product === t.product && n.showNet ? [{
					key: Yi,
					value: Y(`净${q(n.product)} `, Q(n.netResourceAmount, "signed", q(n.product)))
				}] : []))
			}))
		};
	}) : [];
}
function pa(e, t) {
	return Object.entries(e.extraMaterial).map(([e, n]) => $(`${t}-material-${e}`, X("无人机额外材料"), Y(q(e), " ", Q(n, "signed", q(e)))));
}
function ma(e, t) {
	return e.overflowed ? [$(`${t}-overflow`, X("无人机爆仓"), Y("超出 ", Q(e.overflowAmount, "number", "架"), "架"))] : [];
}
function ha(e, t) {
	return [
		$(`${t}-base`, X("基础速率"), Z(e.baseAmountPerHour, "production", "/小时")),
		$(`${t}-amount`, X("消耗无人机"), Y(Q(e.droneAmount, "number", "架"), "架")),
		$(`${t}-hours`, X("加速时长"), Y(Q(e.acceleratedHours, "number", "小时"), "小时")),
		$(`${t}-extra`, X("无人机额外产出"), ea(e.extraAmount, "production")),
		...pa(e, t),
		...ma(e, t)
	];
}
function ga(e, t) {
	return t.flatMap((t) => {
		let n = `drone-${t.facilityId}-${t.order}`, r = e.plans[t.sourcePlanIndex];
		return [
			$(`${n}-room`, X("设施"), X(`${O[t.room]}${t.facilityIndex + 1}`)),
			$(`${n}-order`, X("加速时机"), X(t.order === "pre" ? "换班前" : "换班后")),
			$(`${n}-source`, X("来源队列"), X(r ? ia(r, t.sourcePlanIndex) : `队列${t.sourcePlanIndex + 1}`)),
			$(`${n}-product`, X("产物"), X(q(t.product))),
			...ha(t, n)
		];
	});
}
function _a(e) {
	return e.flatMap((e) => {
		let t = `facility-drone-${e.facilityId}-${e.order}`;
		return [
			$(`${t}-order`, X("加速时机"), X(e.order === "pre" ? "换班前" : "换班后")),
			$(`${t}-product`, X("加速产物"), X(q(e.product))),
			...ha(e, t)
		];
	});
}
function va(e) {
	let t = e.maaDroneAcceleration;
	if (!t?.enabled) return;
	let n = Ri(e).map((t) => {
		let n = t.candidates.filter((e) => !e.accelerated), r = [];
		return t.details.length && r.push(ra(`maa-${t.planIndex}-details`, void 0, ga(e, t.details))), n.length && r.push({
			key: `maa-${t.planIndex}-others`,
			label: "其他设施加速收益",
			rows: [],
			entries: n.map((e) => ({
				key: `candidate-${e.facilityId}`,
				rows: [],
				cells: [
					X(`${O[e.room]}${e.facilityIndex + 1}`),
					X(q(e.product)),
					Y("基础 ", Q(e.baseAmountPerHour, "production", "/小时"), "/小时"),
					Y("额外 ", Q(e.extraAmount, "production", q(e.product)), ...Object.entries(e.extraMaterial).flatMap(([e, t]) => [
						" · ",
						q(e),
						" ",
						Q(t, "signed", q(e))
					]))
				]
			}))
		}), {
			key: `maa-${t.planIndex}`,
			title: X(ia(t.plan, t.planIndex)),
			subtitle: aa(t.plan.durationHours),
			...t.candidates.length ? { badge: X(`${t.candidates.length} 项`) } : {},
			sections: r,
			...t.details.length ? {} : { empty: "当前队列未设置无人机加速" }
		};
	});
	return {
		key: "maa-drone-acceleration",
		label: "MAA 换班式无人机加速",
		hint: Y("消耗 ", Q(t.usedDrones, "number", "架"), " 架"),
		cards: n
	};
}
function ya(e, t, n) {
	return n.flatMap((n) => {
		let r = q(n.material);
		return [
			$(`${e}-${n.material}-base`, X(`${t}材料消耗 · 基础速率`), Y(r, " ", Q(n.baseAmountPerHour, "signed", "/小时"), "/小时")),
			$(`${e}-${n.material}-daily`, X(`${t}材料消耗 · 队列折算`), Y(r, " ", Q(n.dailyAmount, "signed", "/日"), "/日")),
			$(`${e}-${n.material}-total`, X(`${t}材料消耗 · 队列时长总消耗`), Y(r, " ", Q(n.queueTotal, "signed", r)))
		];
	});
}
function ba(e) {
	return e.orders.map((t) => $(`${e.label}-order-${t.name}-name`, Y(`${e.label} · 订单产出 · ${t.name} · `, Q(t.probability * 100, "number", "%"), "%"), Y("基础 ", Q(t.baseRate, "production", "/小时"), "/小时 · 总 ", Q(t.totalRate, "production", "/小时"), "/小时", ...t.ignoreEfficiency ? [" · 固定订单"] : [])));
}
function xa(e) {
	let t = [
		$(`${e.product}-efficiency`, X("总效率"), Z(e.totalEfficiency, "efficiency", "%")),
		$(`${e.product}-base-output`, X("基础效率产出"), Z(e.baseOutputPerHour, "production", "/小时")),
		$(`${e.product}-total-output`, X("总效率产出"), Z(e.totalOutputPerHour, "production", "/小时")),
		$(`${e.product}-daily`, X("队列折算"), Y(Q(e.dailyContribution, "production", "/日"), "/日")),
		$(`${e.product}-queue-total`, X("队列时长总产出"), ea(e.queueTotal, "production"))
	], n = [];
	return e.materials.length && n.push({
		key: `${e.product}-materials`,
		label: "材料消耗合计",
		rows: ya(`${e.product}-material`, "", e.materials)
	}), e.facilities.length && n.push({
		key: `${e.product}-facilities`,
		label: "设施明细",
		rows: e.facilities.flatMap((e) => [
			$(`${e.label}-eff`, X(`${e.label} · 总效率`), Z(e.totalEfficiency, "efficiency", "%")),
			$(`${e.label}-base`, X(`${e.label} · 基础产出`), Z(e.baseOutputPerHour, "production", "/小时")),
			$(`${e.label}-total`, X(`${e.label} · 总产出`), Z(e.totalOutputPerHour, "production", "/小时")),
			...ya(`${e.label}-material`, `${e.label} · `, e.materials),
			...ba(e)
		])
	}), {
		key: `product-${e.product}`,
		label: q(e.product),
		rows: t,
		...n.length ? { sections: n } : {}
	};
}
function Sa(e) {
	let t = e.sanity.items.map((e) => ({
		key: `sanity-${e.resource}`,
		label: Y(e.label, " · ", Q(e.amount, "signed", e.amountUnit), " ", e.amountUnit, "/日"),
		...e.contribution === void 0 ? { value: X("未计入") } : { value: Y(Q(e.contribution, "signed", "理智"), " 理智") }
	}));
	return t.push({
		key: "sanity-total",
		label: X(e.sanity.complete ? "队列等效理智合计" : "队列等效理智合计（部分）"),
		value: Y(Q(e.sanity.total, "signed", "理智"), "理智/日")
	}), {
		key: "queue-sanity",
		label: "队列等效理智",
		rows: t
	};
}
function Ca(e, t) {
	let n = Ei(e, t.sanityValues, t.facilityLabel ? { facilityLabel: t.facilityLabel } : {});
	if (n.length) return {
		key: "daily-output-breakdown",
		label: "队列计算明细",
		hint: X("按队列时长折算到每日产出"),
		cards: n.map((e) => ({
			key: `daily-output-${e.planIndex}`,
			title: X(ia(e.plan, e.planIndex)),
			subtitle: aa(e.plan.durationHours),
			badge: X(`${e.products.length} 种产物`),
			sections: [...e.products.map(xa), Sa(e)]
		}))
	};
}
function wa(e, t) {
	let n = Li(e, t.visibleBasePointTerms);
	if (n.length) return {
		key: "base-points",
		label: "基地点数",
		columns: n.map((e) => ({
			key: `base-points-${e.planIndex}`,
			title: X(ia(e.plan, e.planIndex)),
			subtitle: aa(e.plan.durationHours),
			points: e.points.map((e) => ({
				key: e.term,
				name: X(t.basePointLabel?.(e.term) ?? Vi(e.term, {})),
				value: ea(e.value),
				sources: e.sources.map((n, r) => ({
					key: `${e.term}-${n.operator}-${n.kind}-${r}`,
					label: X(t.basePointSource?.(n) ?? Bi(n, {})),
					value: ea(n.value, "signed")
				}))
			})),
			empty: "当前队列无基地点数"
		}))
	};
}
function Ta(e) {
	return {
		key: "skill-details",
		label: "生效技能明细",
		rows: [],
		entries: e.map((e, t) => {
			let n = gi(e.stat);
			return {
				key: `skill-${e.operator}-${e.skill ?? "skill"}-${e.stat}-${t}`,
				title: Y(e.operator, ...e.skill ? [" · ", e.skill] : []),
				value: Y(`${mi(e.stat)} `, Q(e.value, "signed", n), n),
				rows: ii(e).map((e, t) => ({
					key: `calculation-${t}`,
					...e.label ? { label: X(e.label) } : {},
					value: X(e.value)
				}))
			};
		})
	};
}
function Ea(e, t) {
	return {
		key: "moods",
		label: "干员心情消耗步骤",
		rows: [],
		entries: e.map((e) => {
			let n = e.rateDetails.map((e, t) => ({
				key: `mood-rate-${e.kind}-${t}`,
				label: X(ui(e)),
				value: Z(e.value, "signed", "/小时")
			}));
			return n.push($("mood-cost-rate", X("消耗速度"), X(di(e))), $("mood-calculation", X("计算过程"), Y(`${K(e.start)} - ${K(e.costRate)} × ${K(t.durationHours)} = ${K(e.end)}`)), $("mood-end", X("剩余心情"), ea(e.end))), {
				key: `mood-${e.facilityId}-${e.slotIndex}-${e.operator}`,
				title: X(e.operator),
				rows: n
			};
		})
	};
}
function Da(e, t) {
	let n = e.production, r = [];
	if (n) {
		r.push($("production-product", X("产物"), X(si(n.product)))), n.cluePreferences?.length && r.push($("production-clue", X("线索倾向"), X(ci(n.cluePreferences)))), r.push($("production-base-rate", X("基础速率"), Z(n.baseAmountPerHour, "production", "/小时")), $("production-rate", X("实际速率"), Z(n.amountPerHour, "production", "/小时")), $("production-item-rate", X("容量消耗速率"), n.itemRate === void 0 ? X("") : Y(Q(n.itemRate, "production", "/小时"), "/小时")));
		let i = _i(n, t.simulateOverflow ?? !1);
		if ((e.facility.type === "trading" || e.facility.type === "manufacture") && i.length && i.forEach((e, t) => {
			r.push($(`facility-material-${e.material}-${t}-base`, X("基础材料消耗速率"), Y(q(e.material), " ", Q(e.baseAmount, "signed", "/小时"), "/小时")), $(`facility-material-${e.material}-${t}-rate`, X("材料消耗速率"), Y(q(e.material), " ", Q(e.amount, "signed", "/小时"), "/小时")));
		}), n.conversion) {
			let e = n.conversion;
			r.push($("production-conversion", X("单位折算"), X(`${K(e.amountPerUnit)} ${e.label}/${e.sourceUnit}`)), $("production-conversion-cycle", X("基础周期"), X(`${K(e.baseCycleHours)} 小时/${e.sourceUnit}`)), $("production-conversion-rate", X("折算实际速率"), Z(li(n, n.amountPerHour), "production", "/小时")));
		}
		n.orderRule && r.push($("production-order-rule", X("订单规则"), X(n.orderRule)));
	}
	let i = e.capacity;
	i && r.push($("capacity-total", X(i.label), Y(Q(i.total, "number", i.unit), " ", i.unit, ta(" （基础 "), na(i.base, "number", i.unit), ta("，技能 "), na(i.skill, "signed", i.unit), ta("）")))), n?.breachTime !== void 0 && r.push($("production-breach", X("爆仓"), Y(`${yi(n)} · `, Q(n.breachTime, "number", "小时"), " 小时")));
	let a = [];
	return i && i.segments.length > 1 && a.push({
		key: "capacity-segments",
		label: "动态容量时间段",
		rows: i.segments.map((e) => ({
			key: `capacity-segment-${e.startHours}-${e.endHours}`,
			label: Y(Q(e.startHours, "number", "小时"), " 小时 - ", Q(e.endHours, "number", "小时"), " 小时"),
			value: Y(Q(e.total, "number", i.unit), " ", i.unit, ta(" （基础 "), na(e.base, "number", i.unit), ta("，技能 "), na(e.skill, "signed", i.unit), ta("）"))
		}))
	}), n?.orders?.length && a.push({
		key: "production-orders",
		label: "订单摘要",
		rows: n.orders.map((e, t) => ({
			key: `order-${e.name}-${e.time}-${e.quantity}-${t}`,
			label: Y(`${e.name} · `, Q(e.probability * 100, "number", "%"), "%"),
			value: Y(Q(e.quantity), " / ", Q(e.time, "number", "小时"), " 小时", ...e.material ? [
				" · ",
				q(e.material),
				" × ",
				Q(e.amount ?? 0)
			] : [])
		}))
	}), ra("production-capacity", "产出与容量", r, a);
}
function Oa(e, t, n) {
	let r = [], i = e.facility;
	return i ? (i.inherited && r.push(ra("inherited", "继承说明", [$("inherited-note", X("说明"), Y("本队列为跳过队列，已继承 ", Hi(i, t.plans).replace(/^继承自 /, ""), " 的干员与练度；心情按当前队列重新计算。"))])), r.push(ra("efficiency-summary", "效率汇总", [
		$("facility-base-efficiency", X("设施效率"), Z(i.baseEfficiency, "number", "%")),
		$("facility-mood-efficiency", X("干员心情效率"), Z(i.moodEfficiency, "signed", "%")),
		$("facility-skill-efficiency", X("干员技能效率"), Z(i.operatorSkillEfficiency, "signed", "%")),
		$("facility-efficiency", X("整体效率"), Z(i.efficiency, "number", "%"))
	])), (i.capacity || i.production) && r.push(Da(i, n)), i.details.length && r.push(Ta(i.details)), e.droneAccelerations?.length && r.push(ra("drone-acceleration", "无人机加速", _a(e.droneAccelerations))), e.moods.length && r.push(Ea(e.moods, e.plan)), r) : (e.moods.length && r.push(Ea(e.moods, e.plan)), r);
}
function ka(e, t, n) {
	let r = e.facility, i = oa(e, t), a = r && !r.details.length && !e.moods.length && !e.droneAccelerations?.length ? "当前设施没有可展开的技能明细" : void 0;
	return {
		key: `step-${e.planIndex}-${r?.facility.id ?? "control"}`,
		planIndex: e.planIndex,
		...r ? { facilityId: r.facility.id } : {},
		facilityLabel: r ? n.facilityLabel?.(r) ?? zi(r, t.document.layout) : O.control,
		...i ? { inheritedLabel: i } : {},
		...r ? { efficiency: r.efficiency } : {},
		sections: Oa(e, t, n),
		...a === void 0 ? {} : { emptyNote: a }
	};
}
function Aa(e, t) {
	return {
		plans: e.plans.map((e, t) => ({
			planIndex: t,
			name: e.name,
			durationHours: e.durationHours
		})),
		steps: xi(e).map((n) => ka(n, e, t))
	};
}
function ja(e) {
	return e.steps.map((t) => {
		let n = e.plans[t.planIndex];
		return {
			key: t.key,
			title: X(`${n?.name ?? ""} · ${t.facilityLabel}`),
			...t.inheritedLabel === void 0 ? {} : { subtitle: Y(" · ", t.inheritedLabel) },
			...t.efficiency === void 0 ? {} : { badge: Z(t.efficiency, "number", "%") },
			sections: t.sections,
			...t.emptyNote === void 0 ? {} : { emptyNote: t.emptyNote }
		};
	});
}
function Ma(e) {
	let t = /* @__PURE__ */ new Map();
	for (let n of e.steps) {
		let e = n.facilityId ?? "control", r = t.get(e);
		r ? r.push(n) : t.set(e, [n]);
	}
	return [...t.entries()].map(([t, n]) => {
		let r = new Map(n.map((e) => [e.planIndex, e]));
		return {
			key: `facility-${t}`,
			label: n[0]?.facilityLabel ?? O.control,
			badge: X(`${n.length} / ${e.plans.length} 个队列`),
			cards: e.plans.map((e) => {
				let n = r.get(e.planIndex);
				return n === void 0 ? {
					key: `empty-${t}-${e.planIndex}`,
					title: X(e.name),
					subtitle: aa(e.durationHours),
					sections: [],
					empty: "当前队列无此设施计算数据"
				} : {
					key: n.key,
					title: X(e.name),
					subtitle: sa(n, e),
					...n.efficiency === void 0 ? {} : { badge: Z(n.efficiency, "number", "%") },
					sections: n.sections,
					...n.emptyNote === void 0 ? {} : { emptyNote: n.emptyNote }
				};
			})
		};
	});
}
function Na(e, t) {
	let n = va(e), r = Ca(e, t), i = wa(e, t);
	return {
		dailyOutput: ua(e, t),
		droneStrategy: da(t),
		droneScenarios: fa(e, t),
		calculationSteps: {
			label: "计算步骤",
			hint: "展开分区查看详细计算过程",
			...n === void 0 ? {} : { maaDrone: n },
			...r === void 0 ? {} : { dailyOutput: r },
			...i === void 0 ? {} : { basePoints: i },
			facilitySteps: Aa(e, t)
		}
	};
}
function Pa(e, t = $i) {
	let n = [], r = (e, r, i, a) => {
		i !== void 0 && n.push({
			level: e,
			key: r,
			...a === void 0 ? {} : { label: a },
			text: J(i, t)
		});
	}, i = (e, a) => {
		for (let o of e) {
			n.push({
				level: a,
				key: o.key,
				...o.label === void 0 ? {} : { label: o.label },
				text: o.label ?? ""
			});
			for (let e of o.rows) r(a + 1, e.key, e.value, e.label === void 0 ? void 0 : J(e.label, t));
			for (let e of o.entries ?? []) {
				r(a + 1, e.key, e.title, e.value === void 0 ? void 0 : J(e.value, t));
				for (let t of e.cells ?? []) r(a + 2, `${e.key}-cell`, t);
				for (let n of e.rows) r(a + 2, n.key, n.value, n.label === void 0 ? void 0 : J(n.label, t));
			}
			i(o.sections ?? [], a + 1);
		}
	}, a = (e, r) => {
		for (let a of e) n.push({
			level: r,
			key: a.key,
			label: J(a.title, t),
			text: [
				J(a.title, t),
				a.subtitle === void 0 ? "" : J(a.subtitle, t),
				a.badge === void 0 ? "" : J(a.badge, t)
			].filter(Boolean).join(" ")
		}), i(a.sections, r + 1);
	};
	n.push({
		level: 0,
		key: e.dailyOutput.key,
		text: e.dailyOutput.label
	}), r(1, "cycle", e.dailyOutput.cycleHours);
	for (let t of e.dailyOutput.tiles) {
		r(1, t.key, t.main, t.product);
		for (let e of t.lines) r(2, `${t.key}-${e.key}`, e.value);
	}
	e.dailyOutput.totalTile && r(1, e.dailyOutput.totalTile.key, e.dailyOutput.totalTile.main, e.dailyOutput.totalTile.product), n.push({
		level: 0,
		key: "drone-strategy",
		text: e.droneStrategy.label
	});
	for (let i of e.droneScenarios) {
		n.push({
			level: 1,
			key: i.key,
			label: J(i.title, t),
			text: [
				J(i.title, t),
				J(i.meta, t),
				J(i.baseRate, t)
			].join(" ")
		});
		for (let e of i.views) {
			n.push({
				level: 2,
				key: `${i.key}-${e.key}`,
				text: e.label
			});
			for (let t of e.tiles) {
				r(3, t.key, t.main, t.product);
				for (let e of t.lines) r(4, `${t.key}-${e.key}`, e.value);
			}
		}
	}
	let o = e.calculationSteps;
	if (n.push({
		level: 0,
		key: "calculation-steps",
		text: o.label
	}), o.maaDrone && (n.push({
		level: 1,
		key: o.maaDrone.key,
		text: [o.maaDrone.label, o.maaDrone.hint === void 0 ? "" : J(o.maaDrone.hint, t)].filter(Boolean).join(" ")
	}), a(o.maaDrone.cards, 2)), o.dailyOutput && (n.push({
		level: 1,
		key: o.dailyOutput.key,
		text: o.dailyOutput.label
	}), a(o.dailyOutput.cards, 2)), o.basePoints) {
		n.push({
			level: 1,
			key: o.basePoints.key,
			text: o.basePoints.label
		});
		for (let e of o.basePoints.columns) {
			r(2, e.key, e.title), r(3, `${e.key}-duration`, e.subtitle);
			for (let n of e.points) {
				r(3, n.key, n.value, J(n.name, t));
				for (let e of n.sources) r(4, e.key, e.value, J(e.label, t));
			}
		}
	}
	for (let e of o.facilitySteps.plans) n.push({
		level: 1,
		key: `plan-${e.planIndex}`,
		text: `${e.name} ${e.durationHours} 小时`
	});
	for (let e of o.facilitySteps.steps) n.push({
		level: 1,
		key: e.key,
		text: [
			e.facilityLabel,
			e.inheritedLabel === void 0 ? "" : e.inheritedLabel,
			e.efficiency === void 0 ? "" : String(e.efficiency)
		].filter(Boolean).join(" ")
	}), i(e.sections, 2);
	return n;
}
//#endregion
export { ot as BASE_POINT_TERM_KEYS, At as BATTLE_RECORD_EXPERIENCE, Rr as DEFAULT_LMD_DRONE_STRATEGIES, A as DEFAULT_RULESET, Mt as DEFAULT_SANITY_SETTINGS, Lr as DRONE_ACCELERATABLE_PRODUCTS, kt as DRONE_ACCELERATION_MINUTES, M as EPSILON, Ve as ORUNDUM_TRADE_ORDER, jt as PURE_GOLD_POINTS, ve as SchedulePeriodError, Be as TRADE_ORDER_LIMIT, Lt as addProductionFlow, Tt as aggregateDaily, Ot as aggregateDailyOutputs, Et as aggregateDailyProductions, Se as analyzeSchedulePeriods, Ni as baseAmountsWithoutMaaDrones, lt as basePointTermOptions, Li as buildBasePointQueueDetails, Si as buildCalculationStepGroups, xi as buildCalculationSteps, ji as buildDailyOutputCards, ua as buildDailyOutputDisplay, Ei as buildDailyOutputQueueDetails, Di as buildDailySanityAmounts, Ii as buildDroneScenarioDisplays, fa as buildDroneScenarioViews, da as buildDroneStrategyDisplay, Gi as buildEfficiencyNotices, Ue as buildFacilities, ja as buildFacilityStepCards, Ma as buildFacilityStepPanes, Ki as buildImportedExtraRoomsNotice, Ri as buildMaaDroneQueueDetails, Na as buildResultDisplay, Wi as buildResultPresentation, Qr as calculateDroneAcceleration, Ir as calculateEfficiency, Rt as calculateSanityResult, Ft as calculateSanityValues, ie as catalogOperator, F as clampMood, u as cloneProgressionEntries, ci as cluePreferenceText, ut as compareBasePointDetails, dt as compareBasePointSources, ct as compareBasePointTermOptions, rt as completeInferredRooms, li as convertedProductionAmount, ne as createEfficiencyCatalog, ge as createSpecialOperatorAvatarLabelResolver, Ke as dormitoryAtmosphere, tt as dormitoryLevels, mi as efficiencyStatLabel, gi as efficiencyStatUnit, hi as efficiencyStatValue, Ye as eliteEfficiency, S as entryHasNode, ee as entryUnlocksFacility, Ge as facilityBaseEfficiency, He as facilityId, yi as facilityOverflowLabel, St as firstItemProgress, b as fixedProgressionNodes, Pa as flattenResultDisplay, Vi as formatBasePointLabel, Bi as formatBasePointSource, $i as formatDisplayNumber, J as formatDisplayValue, vi as formatDurationHours, ti as formatEfficiencyNumber, zi as formatFacilityResultLabel, Hi as formatInheritedSourceLabel, K as formatNumber, ai as formatProduction, E as groupIncludesOperator, ae as groupMembers, bt as hasFlowGoldDisplayOperator, oe as hasGroupMember, _ as highestEliteLevel, at as importPowerSummary, nt as inferScheduleLayout, me as isKnownSpecialOperator, le as isPercentageOperator, pe as isSpecialOperator, fe as isTermOperator, j as manufactureRule, g as maximumProgressionForFacility, qe as meetingAtmosphereBonus, We as meetingBaseEfficiency, h as minimumProgressionForNodes, ui as moodRateDetailLabel, di as moodRateFormula, bi as moodSnapshotsForFacility, y as nodesForOperator, ri as operatorCalculationLines, ii as operatorCalculationRows, Hr as parseLmdDroneStrategy, l as parseOperatorProgressionImport, ce as percentageOperatorValue, ei as planDurationHoursValue, si as productionLabel, _i as productionMaterialsForDisplay, c as progressionEntryFromUnknown, d as progressionNodes, x as progressionNodesForFacility, Je as rarityEfficiency, it as resizeImportedRooms, v as resolveOperatorProgression, q as resourceLabel, Ui as resultPresentationSourceFacility, I as roomAssignments, zt as sanityItemDefinitions, ye as schedulePeriodForRange, D as schedulePeriodMinute, ni as signedNumber, he as specialOperatorAvatarLabel, _e as specialOperatorTermMembers, xt as stateOf, ue as termKeysForSpecialOperator };
