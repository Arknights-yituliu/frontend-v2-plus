import { operatorTableV2 } from '/src/utils/gameData.js'

const MODULE_TYPES = ['X', 'Y', 'D', 'A', 'B']
const MODULE_FIELD_NAME_BY_TYPE = {
    X: 'modX',
    Y: 'modY',
    D: 'modD',
    A: 'modA',
    B: 'modB',
}
const OPERATOR_ZOOT_MATCHER_MODULE_TYPE_BY_NUMBER = {
    1: 'X',
    2: 'Y',
    3: 'D',
    4: 'A',
    5: 'B',
}
const MODULE_FIELD_NAMES = Object.values(MODULE_FIELD_NAME_BY_TYPE)
const MODULE_GREEK_CHAR_BY_TYPE = {
    X: 'χ',
    Y: 'γ',
    D: 'Δ',
    A: 'α',
    B: 'β',
}
const MAX_LEVELS_BY_RARITY = {
    1: [30, 0, 0],
    2: [30, 0, 0],
    3: [40, 55, 0],
    4: [45, 60, 70],
    5: [50, 70, 80],
    6: [50, 80, 90],
}

function normalizeOperatorName(name = '') {
    return String(name)
        .trim()
        .replace(/\s+/g, '')
        .replace(/[（(].*?[）)]/g, '')
        .replace(/[·•・]/g, '')
}

function sanitizeInteger(value) {
    const number = Number(value)

    if (!Number.isFinite(number)) {
        return undefined
    }

    return Math.max(0, Math.floor(number))
}

function sanitizeModuleNumber(value) {
    const number = Number(value)

    if (!Number.isFinite(number)) {
        return undefined
    }

    const integer = Math.floor(number)

    return integer >= 0 ? integer : undefined
}

function normalizeModuleTypeFromNumber(moduleNumber) {
    return OPERATOR_ZOOT_MATCHER_MODULE_TYPE_BY_NUMBER[moduleNumber]
}

function escapeRegex(value = '') {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function normalizeModuleType(value) {
    if (!value) {
        return undefined
    }

    const trimmedValue = String(value).trim()

    if (!trimmedValue) {
        return undefined
    }

    const upperValue = trimmedValue.toUpperCase()

    if (MODULE_FIELD_NAME_BY_TYPE[upperValue]) {
        return upperValue
    }

    const compactUpperValue = upperValue.replace(/[\s_-]+/g, '')
    const prefixedTypeMatch = compactUpperValue.match(/^(?:MOD|MODULE)([XYDAB])$/)

    if (prefixedTypeMatch) {
        return prefixedTypeMatch[1]
    }

    const chineseTypeMatch = upperValue.match(/^([XYDAB])\s*模(?:组)?$/)

    if (chineseTypeMatch) {
        return chineseTypeMatch[1]
    }

    const greekTypeMap = {
        χ: 'X',
        Χ: 'X',
        γ: 'Y',
        Γ: 'Y',
        Δ: 'D',
        α: 'A',
        Α: 'A',
        β: 'B',
        Β: 'B',
    }

    return greekTypeMap[trimmedValue]
}

function normalizeModuleTypeList(values = []) {
    return [...new Set(
        values
            .map((value) => normalizeModuleType(value))
            .filter(Boolean),
    )]
}

function buildModuleLevelsByType(operator = {}) {
    return MODULE_TYPES.reduce((result, type) => {
        const fieldName = MODULE_FIELD_NAME_BY_TYPE[type]
        const level = sanitizeInteger(operator?.[fieldName])

        if (level !== undefined) {
            result[type] = level
        }

        return result
    }, {})
}

const operatorModuleMetadataByCharId = new Map()
const operatorModuleMetadataByName = new Map()

for (const [charId, operator] of Object.entries(operatorTableV2)) {
    const normalizedName = normalizeOperatorName(operator?.name)
    const availableModuleTypes = []
    const moduleNamesByType = {}

    for (const equipItem of Array.isArray(operator?.equip) ? operator.equip : []) {
        const moduleType = normalizeModuleType(equipItem?.typeName2)

        if (!moduleType) {
            continue
        }

        if (!availableModuleTypes.includes(moduleType)) {
            availableModuleTypes.push(moduleType)
        }

        moduleNamesByType[moduleType] = String(equipItem?.uniEquipName || '').trim()
    }

    const metadata = {
        charId,
        name: operator?.name || '',
        availableModuleTypes,
        moduleNamesByType,
    }

    operatorModuleMetadataByCharId.set(charId, metadata)

    if (normalizedName) {
        operatorModuleMetadataByName.set(normalizedName, metadata)
    }
}

function getOperatorModuleMetadata(operator = {}) {
    if (operator?.charId && operatorModuleMetadataByCharId.has(operator.charId)) {
        return operatorModuleMetadataByCharId.get(operator.charId)
    }

    const normalizedName = operator?.normalizedName || normalizeOperatorName(operator?.name)

    if (normalizedName && operatorModuleMetadataByName.has(normalizedName)) {
        return operatorModuleMetadataByName.get(normalizedName)
    }

    return null
}

function getModuleBranchPatterns(type) {
    const normalizedType = normalizeModuleType(type)

    if (!normalizedType) {
        return []
    }

    const greekChar = MODULE_GREEK_CHAR_BY_TYPE[normalizedType]
    const branchToken = [normalizedType, greekChar]
        .filter(Boolean)
        .map((value) => escapeRegex(value))
        .join('|')

    if (!branchToken) {
        return []
    }

    return [
        `(?:${branchToken})\\s*模组`,
        `模组\\s*(?:${branchToken})`,
        `(?:${branchToken})\\s*模`,
        `模\\s*(?:${branchToken})`,
    ]
}

function inferModuleTypeFromDetails(operator, details = '') {
    const metadata = getOperatorModuleMetadata(operator)

    if (!metadata || metadata.availableModuleTypes.length === 0) {
        return undefined
    }

    if (metadata.availableModuleTypes.length === 1) {
        return metadata.availableModuleTypes[0]
    }

    const normalizedDetails = String(details || '').trim()

    if (!normalizedDetails) {
        return undefined
    }

    for (const type of metadata.availableModuleTypes) {
        const moduleName = metadata.moduleNamesByType?.[type]

        if (moduleName && normalizedDetails.includes(moduleName)) {
            return type
        }
    }

    const escapedName = escapeRegex(operator?.name || '')

    if (!escapedName) {
        return undefined
    }

    for (const type of metadata.availableModuleTypes) {
        const branchPatterns = getModuleBranchPatterns(type)

        if (branchPatterns.some((pattern) => (
            new RegExp(`${escapedName}[^\\n]{0,18}${pattern}`).test(normalizedDetails)
            || new RegExp(`${pattern}[^\\n]{0,18}${escapedName}`).test(normalizedDetails)
        ))) {
            return type
        }
    }

    return undefined
}

function normalizeRequirements(requirements = {}) {
    if (!requirements || typeof requirements !== 'object') {
        return {}
    }

    const moduleNumber = sanitizeModuleNumber(
        requirements.module
        ?? requirements.module_number
        ?? requirements.moduleNumber
        ?? requirements.module_id
        ?? requirements.moduleId,
    )
    const explicitModuleType = normalizeModuleType(
        requirements.module_type
        ?? requirements.moduleType
        ?? requirements.module_branch
        ?? requirements.moduleBranch,
    )
    const explicitModuleTypeNumber = sanitizeModuleNumber(
        requirements.module_type_number
        ?? requirements.moduleTypeNumber
        ?? requirements.module_type_index
        ?? requirements.moduleTypeIndex,
    )
    const moduleType = explicitModuleType
        || normalizeModuleTypeFromNumber(explicitModuleTypeNumber)
        || normalizeModuleTypeFromNumber(moduleNumber)
    const moduleLevel = sanitizeInteger(
        requirements.module_level
        ?? requirements.moduleLevel
        ?? requirements.module_rank
        ?? requirements.moduleRank,
    )
    const skillLevel = sanitizeInteger(
        requirements.skill_level
        ?? requirements.skillLevel
        ?? requirements.skill_rank
        ?? requirements.skillRank,
    )

    return {
        elite: sanitizeInteger(requirements.elite),
        level: sanitizeInteger(requirements.level),
        skillLevel,
        moduleNumber,
        moduleType,
        moduleLevel: Number.isFinite(moduleLevel) && moduleLevel > 0 ? moduleLevel : undefined,
    }
}

function normalizeSkillRequirement(skillLevel) {
    const normalizedSkillLevel = sanitizeInteger(skillLevel)

    if (normalizedSkillLevel === undefined || normalizedSkillLevel <= 0) {
        return {
            rawSkillLevel: normalizedSkillLevel,
            skillLevel: undefined,
            skillMode: undefined,
        }
    }

    if (normalizedSkillLevel >= 8) {
        return {
            rawSkillLevel: normalizedSkillLevel,
            skillLevel: normalizedSkillLevel - 7,
            skillMode: 'mastery',
        }
    }

    return {
        rawSkillLevel: normalizedSkillLevel,
        skillLevel: normalizedSkillLevel,
        skillMode: 'main',
    }
}

function toNamedOperator(value) {
    if (!value) {
        return null
    }

    const rawOperator = typeof value === 'string' ? { name: value } : value
    const name = rawOperator.name || rawOperator.operatorName || rawOperator.label

    if (!name) {
        return null
    }

    const trimmedName = String(name).trim()
    const normalizedName = normalizeOperatorName(trimmedName)

    if (!normalizedName) {
        return null
    }

    return {
        name: trimmedName,
        normalizedName,
        skill: sanitizeInteger(
            rawOperator.skill
            ?? rawOperator.skill_index
            ?? rawOperator.skillIndex,
        ),
        skillUsage: sanitizeInteger(
            rawOperator.skill_usage
            ?? rawOperator.skillUsage,
        ),
        skillTimes: sanitizeInteger(
            rawOperator.skill_times
            ?? rawOperator.skillTimes,
        ),
        requirements: normalizeRequirements(rawOperator.requirements),
    }
}

function annotateOperatorModuleRequirement(operator, details = '') {
    if (!operator?.requirements) {
        return operator
    }

    const requiresModule = Boolean(operator.requirements.moduleType)
        || (Number.isFinite(operator.requirements.moduleNumber) && operator.requirements.moduleNumber > 0)

    if (!requiresModule) {
        return operator
    }

    const metadata = getOperatorModuleMetadata(operator)
    const moduleType = operator.requirements.moduleType || inferModuleTypeFromDetails(operator, details)
    const moduleCandidateTypes = moduleType
        ? [moduleType]
        : metadata?.availableModuleTypes || []

    return {
        ...operator,
        requirements: {
            ...operator.requirements,
            moduleType,
            moduleCandidateTypes,
        },
    }
}

function collectUniqueOperators(values = []) {
    const operatorMap = new Map()

    for (const value of values) {
        const operator = toNamedOperator(value)

        if (!operator) {
            continue
        }

        operatorMap.set(operator.normalizedName, operator)
    }

    return [...operatorMap.values()]
}

function collectGroupCandidates(group) {
    const candidates = []

    if (Array.isArray(group)) {
        candidates.push(...group)
    }

    if (Array.isArray(group?.opers)) {
        candidates.push(...group.opers)
    }

    if (Array.isArray(group?.operators)) {
        candidates.push(...group.operators)
    }

    if (Array.isArray(group?.members)) {
        candidates.push(...group.members)
    }

    return collectUniqueOperators(candidates)
}

function formatGroupLabel(name, candidates) {
    const trimmedName = typeof name === 'string' ? name.trim() : ''

    if (trimmedName) {
        return trimmedName
    }

    if (!candidates.length) {
        return '未命名分组'
    }

    const preview = candidates.slice(0, 4).map((item) => item.name).join(' / ')

    if (candidates.length <= 4) {
        return preview
    }

    return `${preview} 等${candidates.length}名`
}

function getMaxLevelsByRarity(rarity) {
    return MAX_LEVELS_BY_RARITY[rarity] || MAX_LEVELS_BY_RARITY[1]
}

function getProgressScore({ rarity, elite = 0, level = 1 }) {
    const maxLevels = getMaxLevelsByRarity(rarity)
    let score = 0

    for (let index = 0; index < elite; index += 1) {
        score += maxLevels[index] || 0
    }

    return score + Math.max(0, level)
}

function inferRequirementElite(requirements, rarity) {
    if (requirements.elite !== undefined) {
        return requirements.elite
    }

    if (requirements.level === undefined) {
        return undefined
    }

    const maxLevels = getMaxLevelsByRarity(rarity)
    let elite = 0

    while (
        elite < maxLevels.length - 1
        && maxLevels[elite] > 0
        && requirements.level > maxLevels[elite]
    ) {
        elite += 1
    }

    return elite
}

function inferOwnedMainSkillLevel(ownedOperator) {
    const mainSkill = sanitizeInteger(ownedOperator?.mainSkill)

    if (mainSkill !== undefined && mainSkill > 0) {
        return mainSkill
    }

    const skillLevels = [
        sanitizeInteger(ownedOperator?.skill1),
        sanitizeInteger(ownedOperator?.skill2),
        sanitizeInteger(ownedOperator?.skill3),
    ].filter((level) => level !== undefined)

    return skillLevels.some((level) => level > 0) ? 7 : mainSkill
}

function buildOwnedOperatorLookup(operators = []) {
    const lookup = new Map()

    for (const operator of operators) {
        const namedOperator = toNamedOperator(operator)

        if (!namedOperator) {
            continue
        }

        const moduleLevelsByType = buildModuleLevelsByType(operator)
        const moduleLevels = Object.values(moduleLevelsByType)
        const moduleMetadata = getOperatorModuleMetadata({
            charId: operator?.charId,
            normalizedName: namedOperator.normalizedName,
            name: namedOperator.name,
        })
        const availableModuleTypes = moduleMetadata?.availableModuleTypes?.length
            ? moduleMetadata.availableModuleTypes
            : Object.keys(moduleLevelsByType)
        const maxModuleLevel = moduleLevels.length > 0 ? Math.max(...moduleLevels) : undefined
        const elite = sanitizeInteger(operator?.elite)
        const level = sanitizeInteger(operator?.level)
        const skill1 = sanitizeInteger(operator?.skill1)
        const skill2 = sanitizeInteger(operator?.skill2)
        const skill3 = sanitizeInteger(operator?.skill3)
        const mainSkill = sanitizeInteger(operator?.mainSkill)
        const rarity = sanitizeInteger(operator?.rarity)
        const hasProgression = [
            elite,
            level,
            skill1,
            skill2,
            skill3,
            mainSkill,
            maxModuleLevel,
        ].some((item) => item !== undefined)

        lookup.set(namedOperator.normalizedName, {
            charId: operator?.charId,
            name: namedOperator.name,
            rarity,
            elite,
            level,
            mainSkill,
            skill1,
            skill2,
            skill3,
            maxModuleLevel,
            moduleLevelsByType,
            availableModuleTypes,
            moduleNamesByType: moduleMetadata?.moduleNamesByType || {},
            hasProgression,
        })
    }

    return lookup
}

function buildRequirementProfile(requirementOperator, ownedOperator) {
    const requirements = requirementOperator.requirements || {}
    const skillIndex = sanitizeInteger(requirementOperator.skill)
    const normalizedSkillRequirement = normalizeSkillRequirement(requirements.skillLevel)
    const requirementModuleType = normalizeModuleType(requirements.moduleType)
    const requiresModule = Boolean(requirementModuleType)
        || (Number.isFinite(requirements.moduleNumber) && requirements.moduleNumber > 0)
    const moduleMetadata = getOperatorModuleMetadata(requirementOperator) || getOperatorModuleMetadata(ownedOperator)
    const moduleCandidateTypes = Array.isArray(requirements.moduleCandidateTypes) && requirements.moduleCandidateTypes.length > 0
        ? normalizeModuleTypeList(requirements.moduleCandidateTypes)
        : normalizeModuleTypeList(moduleMetadata?.availableModuleTypes || [])

    return {
        elite: requirements.elite,
        level: requirements.level,
        skillLevel: normalizedSkillRequirement.skillLevel,
        rawSkillLevel: normalizedSkillRequirement.rawSkillLevel,
        skillMode: normalizedSkillRequirement.skillMode,
        skillIndex: skillIndex >= 1 && skillIndex <= 3 ? skillIndex : undefined,
        moduleNumber: requirements.moduleNumber,
        moduleLevel: requirements.moduleLevel,
        requiresModule,
        moduleType: requirementModuleType,
        moduleCandidateTypes: requirementModuleType ? [requirementModuleType] : moduleCandidateTypes,
        inferredElite: ownedOperator?.rarity === undefined
            ? undefined
            : inferRequirementElite(requirements, ownedOperator.rarity),
    }
}

function buildOwnedProfile(ownedOperator, requirementProfile = {}) {
    if (!ownedOperator) {
        return null
    }

    return {
        elite: ownedOperator.elite,
        level: ownedOperator.level,
        mainSkill: inferOwnedMainSkillLevel(ownedOperator),
        skill1: ownedOperator.skill1,
        skill2: ownedOperator.skill2,
        skill3: ownedOperator.skill3,
        module: ownedOperator.maxModuleLevel,
        moduleLevelsByType: ownedOperator.moduleLevelsByType || {},
        availableModuleTypes: ownedOperator.availableModuleTypes || [],
        moduleNamesByType: ownedOperator.moduleNamesByType || {},
        moduleType: requirementProfile.moduleType,
        moduleCandidateTypes: requirementProfile.moduleCandidateTypes || [],
        moduleLevel: requirementProfile.moduleLevel,
        requiresModule: requirementProfile.requiresModule,
        hasProgression: ownedOperator.hasProgression,
    }
}

function getMinimumRequiredModuleLevel(requirementProfile = {}) {
    if (!requirementProfile.requiresModule) {
        return undefined
    }

    const explicitModuleLevel = sanitizeInteger(requirementProfile.moduleLevel)

    return explicitModuleLevel !== undefined && explicitModuleLevel > 0 ? explicitModuleLevel : 1
}

function evaluateOwnedModuleProgress(requirementProfile, ownedOperator) {
    if (!requirementProfile.requiresModule) {
        return {
            readiness: 'skipped',
            missingChecks: [],
            unknownChecks: [],
            moduleDisplayTypes: requirementProfile.moduleCandidateTypes || [],
        }
    }

    const ownedModuleLevels = ownedOperator?.moduleLevelsByType || {}
    const availableModuleTypes = Array.isArray(ownedOperator?.availableModuleTypes) && ownedOperator.availableModuleTypes.length > 0
        ? ownedOperator.availableModuleTypes
        : Object.keys(ownedModuleLevels)
    const requestedModuleTypes = Array.isArray(requirementProfile.moduleCandidateTypes) && requirementProfile.moduleCandidateTypes.length > 0
        ? requirementProfile.moduleCandidateTypes
        : availableModuleTypes
    const moduleDisplayTypes = requirementProfile.moduleType
        ? [requirementProfile.moduleType]
        : requestedModuleTypes
    const minimumModuleLevel = getMinimumRequiredModuleLevel(requirementProfile)
    const branchEvaluations = moduleDisplayTypes.map((type) => ({
        type,
        level: sanitizeInteger(ownedModuleLevels[type]),
    }))
    const branchReadiness = branchEvaluations.map((branch) => ({
        ...branch,
        requiredLevel: minimumModuleLevel,
        meetsRequirement: branch.level !== undefined && branch.level >= minimumModuleLevel,
    }))
    const isExactBranchRequirement = Boolean(requirementProfile.moduleType) || moduleDisplayTypes.length <= 1

    if (moduleDisplayTypes.length === 0) {
        return {
            readiness: 'unknown',
            missingChecks: [],
            unknownChecks: ['module'],
            moduleDisplayTypes,
            branchReadiness,
            isExactBranchRequirement,
        }
    }

    if (isExactBranchRequirement) {
        const targetBranch = branchReadiness[0]

        if (targetBranch?.level === undefined) {
            return {
                readiness: 'unknown',
                missingChecks: [],
                unknownChecks: ['module'],
                moduleDisplayTypes,
                branchReadiness,
                isExactBranchRequirement,
            }
        }

        return targetBranch.meetsRequirement
            ? {
                readiness: 'ready',
                missingChecks: [],
                unknownChecks: [],
                moduleDisplayTypes,
                branchReadiness,
                isExactBranchRequirement,
            }
            : {
                readiness: 'not_ready',
                missingChecks: ['module'],
                unknownChecks: [],
                moduleDisplayTypes,
                branchReadiness,
                isExactBranchRequirement,
            }
    }

    if (branchReadiness.some((branch) => branch.level === undefined)) {
        return {
            readiness: 'unknown',
            missingChecks: [],
            unknownChecks: ['module_branch'],
            moduleDisplayTypes,
            branchReadiness,
            isExactBranchRequirement,
        }
    }

    const metBranchCount = branchReadiness.filter((branch) => branch.meetsRequirement).length

    if (metBranchCount === branchReadiness.length) {
        return {
            readiness: 'ready',
            missingChecks: [],
            unknownChecks: [],
            moduleDisplayTypes,
            branchReadiness,
            isExactBranchRequirement,
        }
    }

    if (metBranchCount === 0) {
        return {
            readiness: 'not_ready',
            missingChecks: ['module'],
            unknownChecks: [],
            moduleDisplayTypes,
            branchReadiness,
            isExactBranchRequirement,
        }
    }

    return {
        readiness: 'unknown',
        missingChecks: [],
        unknownChecks: ['module_branch'],
        moduleDisplayTypes,
        branchReadiness,
        isExactBranchRequirement,
    }
}

function evaluateOwnedOperatorProgress(requirementOperator, ownedOperator) {
    const requirementProfile = buildRequirementProfile(requirementOperator, ownedOperator)
    const ownedProfile = buildOwnedProfile(ownedOperator, requirementProfile)

    if (!ownedOperator) {
        return {
            readiness: 'missing',
            missingChecks: ['operator'],
            unknownChecks: [],
            requirementProfile,
            ownedProfile,
        }
    }

    const missingChecks = []
    const unknownChecks = []
    let hasUnknownRequirement = false

    if (requirementProfile.elite !== undefined || requirementProfile.level !== undefined) {
        if (ownedOperator.rarity === undefined || ownedOperator.elite === undefined || ownedOperator.level === undefined) {
            hasUnknownRequirement = true
        } else {
            const ownedScore = getProgressScore({
                rarity: ownedOperator.rarity,
                elite: ownedOperator.elite,
                level: ownedOperator.level,
            })
            const requiredScore = getProgressScore({
                rarity: ownedOperator.rarity,
                elite: requirementProfile.inferredElite ?? 0,
                level: requirementProfile.level ?? 1,
            })

            if (ownedScore < requiredScore) {
                missingChecks.push('level')
            }
        }
    }

    if (requirementProfile.skillLevel !== undefined) {
        const ownedSkillLevel = requirementProfile.skillMode === 'mastery'
            ? requirementProfile.skillIndex === undefined
                ? undefined
                : sanitizeInteger(ownedOperator[`skill${requirementProfile.skillIndex}`])
            : inferOwnedMainSkillLevel(ownedOperator)

        if (ownedSkillLevel === undefined) {
            hasUnknownRequirement = true
        } else if (ownedSkillLevel < requirementProfile.skillLevel) {
            missingChecks.push('skill')
        }
    }

    const moduleProgress = evaluateOwnedModuleProgress(requirementProfile, ownedOperator)

    if (ownedProfile) {
        ownedProfile.moduleType = requirementProfile.moduleType
        ownedProfile.moduleCandidateTypes = moduleProgress.moduleDisplayTypes || requirementProfile.moduleCandidateTypes || []
        ownedProfile.moduleBranchReadiness = moduleProgress.branchReadiness || []
        ownedProfile.moduleBranchAmbiguous = !moduleProgress.isExactBranchRequirement
    }

    if (moduleProgress.missingChecks.length > 0) {
        missingChecks.push(...moduleProgress.missingChecks)
    }

    if (moduleProgress.unknownChecks.length > 0) {
        hasUnknownRequirement = true
        unknownChecks.push(...moduleProgress.unknownChecks)
    }

    if (missingChecks.length > 0) {
        return {
            readiness: 'not_ready',
            missingChecks,
            unknownChecks,
            requirementProfile,
            ownedProfile,
        }
    }

    if (hasUnknownRequirement) {
        return {
            readiness: 'unknown',
            missingChecks: [],
            unknownChecks,
            requirementProfile,
            ownedProfile,
        }
    }

    return {
        readiness: 'ready',
        missingChecks: [],
        unknownChecks: [],
        requirementProfile,
        ownedProfile,
    }
}

function parseOperatorZootMatcherJobContent(content) {
    const parsed = typeof content === 'string' ? JSON.parse(content) : content
    const details = parsed?.doc?.details?.trim?.() || ''
    const requiredOperators = collectUniqueOperators(parsed?.opers || [])
        .map((operator) => annotateOperatorModuleRequirement(operator, details))
    const groups = (Array.isArray(parsed?.groups) ? parsed.groups : [])
        .map((group) => {
            const candidates = collectGroupCandidates(group)
                .map((candidate) => annotateOperatorModuleRequirement(candidate, details))

            return {
                name: typeof group?.name === 'string' ? group.name.trim() : '',
                label: formatGroupLabel(group?.name, candidates),
                candidates,
            }
        })
        .filter((group) => group.candidates.length > 0)

    return {
        parsed,
        title: parsed?.doc?.title?.trim?.() || '',
        details,
        stageName: parsed?.stage_name || '',
        requiredOperators,
        groups,
    }
}

function matchOwnedOperators(requirement, ownedOperatorLookup) {
    const requiredOperatorEvaluations = requirement.requiredOperators.map((operator) => {
        const ownedOperator = ownedOperatorLookup.get(operator.normalizedName)

        return {
            ...operator,
            ownedOperator,
            progress: evaluateOwnedOperatorProgress(operator, ownedOperator),
        }
    })
    const matchedOperators = requiredOperatorEvaluations.filter((operator) => operator.ownedOperator)
    const missingOperators = requiredOperatorEvaluations.filter((operator) => !operator.ownedOperator)

    const groupEvaluations = requirement.groups.map((group) => {
        const candidateEvaluations = group.candidates
            .map((candidate) => {
                const ownedOperator = ownedOperatorLookup.get(candidate.normalizedName)

                return {
                    ...candidate,
                    ownedOperator,
                    progress: evaluateOwnedOperatorProgress(candidate, ownedOperator),
                }
            })
        const matchedCandidates = candidateEvaluations.filter((candidate) => candidate.ownedOperator)

        if (matchedCandidates.length === 0) {
            return {
                ...group,
                matchedCandidates: [],
                candidateEvaluations,
                groupReadiness: 'missing',
            }
        }

        const hasReadyCandidate = matchedCandidates.some((candidate) => candidate.progress.readiness === 'ready')
        const hasUnknownCandidate = matchedCandidates.some((candidate) => candidate.progress.readiness === 'unknown')

        return {
            ...group,
            matchedCandidates,
            candidateEvaluations,
            groupReadiness: hasReadyCandidate
                ? 'ready'
                : hasUnknownCandidate
                    ? 'unknown'
                    : 'not_ready',
        }
    })
    const satisfiedGroups = groupEvaluations.filter((group) => group.matchedCandidates.length > 0)
    const missingGroups = groupEvaluations.filter((group) => group.matchedCandidates.length === 0)

    const totalRequiredSlots = requirement.requiredOperators.length + requirement.groups.length
    const totalMissing = missingOperators.length + missingGroups.length
    const trainingGapOperators = matchedOperators.filter((operator) => operator.progress.readiness === 'not_ready')
    const trainingGapGroups = satisfiedGroups.filter((group) => group.groupReadiness === 'not_ready')
    const readinessUnknownOperators = matchedOperators.filter((operator) => operator.progress.readiness === 'unknown')
    const readinessUnknownGroups = satisfiedGroups.filter((group) => group.groupReadiness === 'unknown')

    return {
        matchedOperators,
        missingOperators,
        requiredOperatorEvaluations,
        groupEvaluations,
        satisfiedGroups,
        missingGroups,
        totalRequiredSlots,
        totalMissing,
        matchedRequirementCount: totalRequiredSlots - totalMissing,
        trainingGapOperators,
        trainingGapGroups,
        trainingGapCount: trainingGapOperators.length + trainingGapGroups.length,
        readinessUnknownOperators,
        readinessUnknownGroups,
        readinessUnknownCount: readinessUnknownOperators.length + readinessUnknownGroups.length,
        missingSummary: [
            ...missingOperators.map((operator) => operator.name),
            ...missingGroups.map((group) => group.label),
        ],
    }
}

function resolveOperatorZootMatcherJobs(jobs = [], ownedOperatorLookup) {
    const resolvedJobs = []
    const invalidJobs = []

    for (const job of jobs) {
        try {
            const requirement = parseOperatorZootMatcherJobContent(job?.content || '{}')
            const matchResult = matchOwnedOperators(requirement, ownedOperatorLookup)

            resolvedJobs.push({
                ...job,
                ...requirement,
                ...matchResult,
                uploader: job?.uploader || '',
                uploadTime: job?.upload_time || '',
                hotScore: Number(job?.hot_score || 0),
                ratingRatio: Number(job?.rating_ratio || 0),
                displayTitle: requirement.title || `作业 #${job?.id ?? 'unknown'}`,
            })
        } catch (error) {
            invalidJobs.push({
                id: job?.id,
                error,
            })
        }
    }

    return {
        resolvedJobs,
        invalidJobs,
    }
}

export {
    buildOwnedOperatorLookup,
    normalizeOperatorName,
    resolveOperatorZootMatcherJobs,
}
