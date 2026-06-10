import { removeOrMaskCodeBlocks } from '../src/lib/extraction/codeBlockDetector'
import { cleanText } from '../src/lib/extraction/textCleaner'
import { detectQuestions } from '../src/lib/extraction/questionDetector'
import { extractQaByRules } from '../src/lib/extraction/qaRuleExtractor'

const testText = `def run_agent(user_goal: str):
    plan = planner.decompose(user_goal)

Q: Python 函数如何定义？
A: 使用 def 关键字，后跟函数名和参数列表。`

console.log('=== Input ===')
console.log(testText)
console.log()

// Step by step
const { maskedText, codeRanges } = removeOrMaskCodeBlocks(testText)
console.log('=== Code Ranges ===')
console.log(codeRanges)
console.log('=== Masked Text ===')
maskedText.split('\n').forEach((l, i) => console.log(`${i}: ${JSON.stringify(l)}`))
console.log()

const cleaned = cleanText(maskedText)
console.log('=== Cleaned ===')
cleaned.split('\n').forEach((l, i) => console.log(`${i}: ${JSON.stringify(l)}`))
console.log()

const qs = detectQuestions(cleaned, { codeRanges })
console.log('=== Questions ===')
console.log(`Found: ${qs.length}`)
qs.forEach(q => console.log(`  - [${q.matchType}] ${JSON.stringify(q.text)}`))
console.log()

// Full pipeline
console.log('=== Full Extraction ===')
const result = extractQaByRules(testText, { mode: 'strict' })
console.log(`Candidates: ${result.candidates.length}`)
result.candidates.forEach(c => console.log(`  - [${c.confidence}] ${c.question}`))
