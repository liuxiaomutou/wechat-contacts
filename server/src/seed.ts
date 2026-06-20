import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 开始播种种子数据...');

  // 创建用户
  const adminPassword = await bcrypt.hash('admin123', 10);
  const testPassword = await bcrypt.hash('test123', 10);

  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: adminPassword,
      nickname: '管理员',
      role: 'super_admin',
    },
  });
  console.log(`  ✅ 管理员: admin / admin123 (role: super_admin)`);

  const test = await prisma.user.upsert({
    where: { username: 'test' },
    update: {},
    create: {
      username: 'test',
      password: testPassword,
      nickname: '测试用户',
      role: 'user',
    },
  });
  console.log(`  ✅ 测试用户: test / test123 (role: user)`);

  // 创建名片库
  const library = await prisma.cardLibrary.upsert({
    where: { ownerId_name: { ownerId: admin.id, name: '默认名片库' } },
    update: {},
    create: {
      name: '默认名片库',
      description: '个人通讯录名片库',
      ownerId: admin.id,
    },
  });
  console.log(`  ✅ 名片库: ${library.name} (ID: ${library.id})`);

  // 添加 test 到库
  await prisma.libraryMember.upsert({
    where: { libraryId_userId: { libraryId: library.id, userId: test.id } },
    update: {},
    create: { libraryId: library.id, userId: test.id, role: 'editor' },
  });
  console.log(`  ✅ test 已加入库，角色: editor`);

  // 创建测试名片
  const cards = [
    {
      name: '张三',
      phone: '13800138001',
      email: 'zhangsan@example.com',
      company: '腾讯科技',
      position: '技术总监',
      jobLevel: '总监',
      industry: '互联网',
      field: '技术研发',
      gender: '男',
      wechat: 'zhangsan_wx',
      tags: '技术,管理',
      remark: '前阿里同事',
      libraryId: library.id,
      ownerId: admin.id,
    },
    {
      name: '张三',
      phone: '13800138001',
      email: 'zhangsan@qq.com',
      company: '腾讯科技',
      position: '高级工程师',
      jobLevel: '高级',
      remark: '手机号相同的重复联系人',
      libraryId: library.id,
      ownerId: admin.id,
    },
    {
      name: '李四',
      phone: '13900139002',
      company: '阿里巴巴',
      position: '产品经理',
      industry: '互联网',
      field: '产品',
      wechat: 'lisi_wx',
      tags: '产品,运营',
      remark: '合作伙伴',
      libraryId: library.id,
      ownerId: test.id,
    },
  ];

  for (const cardData of cards) {
    await prisma.card.create({ data: cardData });
  }
  console.log(`  ✅ ${cards.length} 张测试名片已创建`);

  console.log('\n🎉 种子数据播种完成！');
  console.log('   管理员登录: admin / admin123');
  console.log('   测试用户: test / test123');
}

main()
  .catch((e) => {
    console.error('❌ 播种失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
