import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 开始插入种子数据...');

  // 清空旧数据
  await prisma.contactGroup.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.group.deleteMany();

  // 创建分组
  const groups = await Promise.all([
    prisma.group.create({ data: { name: '家人', sort: 1 } }),
    prisma.group.create({ data: { name: '同事', sort: 2 } }),
    prisma.group.create({ data: { name: '朋友', sort: 3 } }),
    prisma.group.create({ data: { name: '客户', sort: 4 } }),
  ]);
  console.log(`  ✅ 创建了 ${groups.length} 个分组`);

  // 创建联系人
  const contactsData = [
    { name: '张三', phone: '13800138001', email: 'zhangsan@example.com', company: '阿里巴巴', position: '技术总监', favorite: true },
    { name: '李四', phone: '13800138002', email: 'lisi@example.com', company: '腾讯', position: '产品经理' },
    { name: '王五', phone: '13800138003', email: 'wangwu@example.com', company: '字节跳动', position: '前端工程师' },
    { name: '赵六', phone: '13800138004', email: 'zhaoliu@example.com', company: '美团', position: '后端开发' },
    { name: '妈妈', phone: '13900000001', email: undefined, company: undefined, position: undefined, favorite: true },
    { name: '爸爸', phone: '13900000002', email: undefined, company: undefined, position: undefined },
    { name: '老张', phone: '13600000001', email: 'oldzhang@example.com', company: '自由职业', position: undefined },
    { name: '刘姐', phone: '13700000001', email: 'liujie@example.com', company: '小木科技', position: '运营总监' },
  ];

  for (const data of contactsData) {
    await prisma.contact.create({ data });
  }
  console.log(`  ✅ 创建了 ${contactsData.length} 个联系人`);

  // 关联联系人到分组
  const allContacts = await prisma.contact.findMany();
  const allGroups = await prisma.group.findMany();

  // 给联系人分配分组
  const groupAssignments = [
    { contactName: '妈妈', groupName: '家人' },
    { contactName: '爸爸', groupName: '家人' },
    { contactName: '张三', groupName: '同事' },
    { contactName: '李四', groupName: '同事' },
    { contactName: '王五', groupName: '同事' },
    { contactName: '赵六', groupName: '同事' },
    { contactName: '老张', groupName: '朋友' },
    { contactName: '刘姐', groupName: '客户' },
    { contactName: '张三', groupName: '朋友' },
    { contactName: '赵六', groupName: '朋友' },
  ];

  for (const { contactName, groupName } of groupAssignments) {
    const contact = allContacts.find(c => c.name === contactName);
    const group = allGroups.find(g => g.name === groupName);
    if (contact && group) {
      await prisma.contactGroup.create({
        data: { contactId: contact.id, groupId: group.id }
      });
    }
  }
  console.log(`  ✅ 关联了 ${groupAssignments.length} 条联系人-分组关系`);

  console.log('🎉 种子数据插入完成！');
}

main()
  .catch((e) => {
    console.error('❌ 种子数据插入失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
