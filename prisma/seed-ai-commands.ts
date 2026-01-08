import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { config } from 'dotenv'

// Load environment variables
config()

const connectionString = process.env.DATABASE_URL!
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const builtinCommands = [
  {
    id: 'builtin-summarize',
    label: '总结',
    description: '总结内容的要点',
    action: 'summarize',
    prompt: '请总结以下内容的要点：\n\n{content}',
    isBuiltIn: true,
    authorId: null,
  },
  {
    id: 'builtin-translate',
    label: '翻译',
    description: '翻译成其他语言',
    action: 'translate',
    prompt: '请将以下内容翻译成英文：\n\n{content}',
    isBuiltIn: true,
    authorId: null,
  },
  {
    id: 'builtin-expand',
    label: '扩展',
    description: '扩展内容使其更完整',
    action: 'expand',
    prompt: '请扩展并完善以下内容，使其更加详细和完整：\n\n{content}',
    isBuiltIn: true,
    authorId: null,
  },
  {
    id: 'builtin-polish',
    label: '润色',
    description: '润色文字使其更专业',
    action: 'polish',
    prompt: '请润色以下文字，使其更加专业和流畅：\n\n{content}',
    isBuiltIn: true,
    authorId: null,
  },
]

async function main() {
  console.log('开始初始化 AI 命令...')

  for (const command of builtinCommands) {
    await prisma.aICommand.upsert({
      where: { id: command.id },
      update: {
        label: command.label,
        description: command.description,
        action: command.action,
        prompt: command.prompt,
      },
      create: command,
    })
    console.log(`✓ 已就绪命令: ${command.label}`)
  }

  console.log('AI 命令初始化完成！')
}

main()
  .catch((e) => {
    console.error('初始化失败:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
