/* =========================================================
   初始数据（首次打开时写入浏览器本地存储，之后可随意编辑）
   ========================================================= */
'use strict';

const SEED = {
  version: 1,
  settings: {
    theme: 'light',
    /* o=0 表示尚未混淆，首次加载时会转为混淆存储 */
    auth: { u: 'Frank', p: 'Stzj123', o: 0 }
  },

  /* ---------- 二、形势分析 ---------- */
  analysis: [
    {
      id: 'ana-work', icon: '💼', title: '工作方面',
      groups: [
        {
          id: 'ana-work-g1', title: '工作复盘',
          items: [
            { id: 'aw1', text: '写材料立意不强，站在领导的角度、站在阅读的角度去思考的自觉度不够高；过于重视形式、花言巧语；对词汇使用的细腻程度不够高；对实际业务了解程度不够深、不够彻底。' },
            { id: 'aw2', text: '审核、辩证的意识不够强，还没有做到一丝不苟、严丝合缝；用 AI 写材料的复核意识不够强烈。' },
            { id: 'aw3', text: '汇报工作逻辑不够清晰，特别是不能够把遇到困难的原因、自己采取的措施、希望领导怎么做讲清楚；在让领导做选择题而不是做主观题方面，做得比较差。' }
          ]
        }
      ]
    },
    {
      id: 'ana-life', icon: '🏠', title: '生活方面',
      groups: [
        {
          id: 'ana-life-body', title: '身体',
          items: [
            { id: 'ab1', text: '尿酸高，过去几年时不时会痛风。' },
            { id: 'ab2', text: '体重一直降不下来，在 75-78 公斤徘徊，与合理体重 69 公斤有明显差距。' },
            { id: 'ab3', text: '有腰椎间盘突出、颈椎增生的老毛病。' },
            { id: 'ab4', text: '睡觉怕热，经常半夜醒来发现跑到地板上睡觉。' }
          ]
        },
        {
          id: 'ana-life-emo', title: '情绪',
          items: [
            { id: 'ae1', text: '容易执着于对错，在意别人对自己的指责，不能够从全局、从轻重缓急出发做出更优的决定。' },
            { id: 'ae2', text: '容易执着于过去，后悔之前做的决策，设想未曾走过的道路有多美好。' }
          ]
        },
        {
          id: 'ana-life-other', title: '其他',
          items: [
            { id: 'ao1', text: '未能好好休息，累的时候多以玩手机等刺激多巴胺释放的行为代替有效休息。' }
          ]
        }
      ]
    },
    {
      id: 'ana-people', icon: '🤝', title: '人际方面',
      groups: [
        {
          id: 'ana-people-g1', title: '人际复盘',
          items: [
            { id: 'ap1', text: '喜欢在群上无脑吹水，未经过认真思考，说话冒进，提出一些缺乏逻辑和实证的观点。' },
            { id: 'ap2', text: '话太多，分享欲太强，意义不大。' }
          ]
        }
      ]
    }
  ],

  /* ---------- 三、目标与问题清单 ---------- */
  goals: [
    {
      id: 'goal1', stars: 5, done: false,
      title: '提升自己的健康水平和代谢能力',
      details: [
        { id: 'gd1', text: '降低体重并维持在合理范围之内，体检指标恢复正常', done: false },
        { id: 'gd2', text: '对精力进行科学管理，合理有效地管理饮食、休息、放松等行为', done: false },
        { id: 'gd3', text: '适当安排有氧、无氧运动，调节自己的代谢能力', done: false }
      ]
    },
    { id: 'goal2', stars: 4, done: false, title: '提升自己深度思考、价值判断和准确决策的能力', details: [] },
    { id: 'goal3', stars: 4, done: false, title: '提升自己运用新技术（当下是 AI 和 3D 打印）、赋能工作和生活的能力', details: [] },
    { id: 'goal4', stars: 4, done: false, title: '提升自己抓住重点、快速记忆、知识迁移的能力', details: [] },
    { id: 'goal5', stars: 3, done: false, title: '提升自己沟通协调的能力', details: [] }
  ],

  /* ---------- 四、事项安排 ---------- */
  todos: {
    sections: [
      {
        id: 'work', title: '💼 工作',
        groups: [
          {
            id: 'work-routine', title: '例行事务',
            items: [
              { id: 'wt1',  text: '做好会议、沟通记录', freq: 'daily',   stars: 3, doneMap: {} },
              { id: 'wt2',  text: '每周五整理工作资料、做好一周工作总结，并提前做好下一周工作计划', freq: 'weekly', stars: 2, doneMap: {} },
              { id: 'wt3',  text: '适时撰写工作信息', freq: 'weekly', stars: 2, doneMap: {} },
              { id: 'wt4',  text: '每周一、每月 3 日收集高频数据', freq: 'weekly', doneMap: {} },
              { id: 'wt5',  text: '每周五报送本周工作清单台账和周工作小结', freq: 'weekly', doneMap: {} },
              { id: 'wt6',  text: '每月 1 日前报送市投促局走访企业清单', freq: 'monthly', doneMap: {} },
              { id: 'wt7',  text: '每月 10 日前报送工作成效给改革信息参阅', freq: 'monthly', doneMap: {} },
              { id: 'wt8',  text: '每月 15 日前报送房地产企业走访情况给房地产市场科', freq: 'monthly', doneMap: {} },
              { id: 'wt9',  text: '每月 25 日前报送重点工作进展和计划给市督查室', freq: 'monthly', stars: 3, doneMap: {} },
              { id: 'wt10', text: '每周一金句仿写；每周二文件拆解、词汇句式库学习；每周三文章逻辑拆解；每周四观点论证撰写；每周五词汇句式库学习；每周末用 AI 对新闻联播和地方动态素材进行拆解', freq: 'weekly', doneMap: {} }
            ]
          },
          {
            id: 'work-tasks', title: '待办任务',
            items: [
              { id: 'wk1', text: '考虑一下要不要报一场招商会议？联系几个牵头单位，问一下情况（联系房地产科去东北的事项）', deadline: '2026-08-31', done: false },
              { id: 'wk2', text: '通过政务服务事项平台，了解我局的行政许可事项，按照厦门市住建局的格式，整理行政许可清单', deadline: '2026-07-24', done: false },
              { id: 'wk3', text: '准备好入党相关的资料', deadline: '2026-07-30', done: false },
              { id: 'wk4', text: '做好广东建设年鉴工作', deadline: '2026-08-30', done: false },
              { id: 'wk5', text: '汕头市住房和城乡建设局干部作风提升任务清单', deadline: '2026-08-18', done: false },
              { id: 'wk6', text: '报民生热线：视频、图片和主持词与结束语', deadline: '2026-08-28', done: false }
            ]
          }
        ]
      },
      {
        id: 'life', title: '🏠 生活',
        groups: [
          {
            id: 'life-notes', title: '注意事项',
            items: [
              { id: 'ln1', text: '注意日常的间隙休息：看屏幕 20 分钟休息 20 秒；思考执行事项 60 分钟强制休息 3-5 分钟，利用这段时间喝水、拉伸、放松', freq: 'daily', stars: 4, doneMap: {} },
              { id: 'ln2', text: '多喝水，少喝饮料，少喝酒', freq: 'daily', stars: 4, doneMap: {} },
              { id: 'ln3', text: '工作日中午要好好休息，不要躺在床上刷手机', freq: 'daily', stars: 4, doneMap: {} }
            ]
          },
          {
            id: 'life-daily', title: '每日例行',
            items: [
              { id: 'ld1', text: '完成工作和必要事项之后（早上六点半到早餐前、中午闲暇、晚上闲暇、工作间隙），安排时间思考构建自己的三观，跟 AI 聊天解决当前碰到的困难', freq: 'daily', stars: 5, doneMap: {} },
              { id: 'ld2', text: '早餐简单吃、午餐简单吃、晚餐也简单吃，不要吃零食', freq: 'daily', stars: 4, doneMap: {} },
              { id: 'ld3', text: '争取每天早上 6 点半起床，晚上 10 点半睡觉，睡够 7 个钟', freq: 'daily', stars: 3, doneMap: {} },
              { id: 'ld4', text: '每天晚上写每日小结、在床上做 10-15 分钟肌肉松解、饭后做 15-20 分钟小幅度有氧运动', freq: 'daily', stars: 3, doneMap: {} },
              { id: 'ld5', text: '中午有时间就去锻炼：松解、无氧、爬坡', freq: 'daily', stars: 3, doneMap: {} },
              { id: 'ld6', text: '每天中午用花生球按摩一下颈椎', freq: 'daily', stars: 2, doneMap: {} }
            ]
          },
          {
            id: 'life-weekly', title: '每周例行',
            items: [
              { id: 'lw1', text: '每周末梳理本周各项随记总结，形成问题清单和改进方法', freq: 'weekly', stars: 5, doneMap: {} },
              { id: 'lw2', text: '每周末梳理上周六至周五的国家统计局宏观分析文章、权威公众号宏观经济和产业经济分析文章，安排周末阅读，没读完的安排工作日中午阅读', freq: 'weekly', stars: 4, doneMap: {} },
              { id: 'lw3', text: '每周五爬取上周六至周五的新闻和报纸摘要内容，让 AI 梳理成简报，打印回家看', freq: 'weekly', stars: 3, doneMap: {} },
              { id: 'lw4', text: '每周制定下周 3D 打印计划，并进行切片', freq: 'weekly', stars: 3, doneMap: {} },
              { id: 'lw5', text: '每周末分析行情走势，利用 AI 进行股票分析，制定下周的投资计划', freq: 'weekly', stars: 3, doneMap: {} }
            ]
          },
          {
            id: 'life-monthly', title: '每月例行',
            items: [
              { id: 'lm1', text: '读一遍《矛盾论》《实践论》《金刚经》', freq: 'monthly', stars: 4, doneMap: {} },
              { id: 'lm2', text: '视每月国家统计数据发布情况，浏览政府统计数据与分析', freq: 'monthly', doneMap: {} }
            ]
          },
          {
            id: 'life-tasks', title: '待办任务',
            items: [
              { id: 'lk1', text: '论文格式重新过一遍、文字再过一遍，把不通顺的地方改一改，发给老师审阅', deadline: '2026-07-30', done: true, doneAt: '2026-07-28' },
              { id: 'lk2', text: '修改蔚榕论文的模型结构', done: false },
              { id: 'lk3', text: '平底锅开锅', done: false },
              { id: 'lk4', text: '了解使用中国移动 AI 豆，把它用在 workbuddy 上面', done: false },
              { id: 'lk5', text: '了解使用 DeepSeek API，用于编程', done: false },
              { id: 'lk6', text: '了解录音设备', done: false }
            ]
          }
        ]
      },
      {
        id: 'learning', title: '📚 学习',
        groups: [
          {
            id: 'learn-skills', title: '技能学习',
            items: [
              {
                id: 'ls1', text: '学习 3D 打印相关知识，学会定期制作产品并利用打印机打印出来', done: false,
                children: [
                  { id: 'ls1c1', text: '3D 打印原理、耗材和切片知识，特别是不同耗材、不同模型的切片参数', done: false },
                  { id: 'ls1c2', text: '学习操作 Blender，掌握基本操作技巧，能较轻松地制作简易模型，并对 AI 生成的模型进行个性化改造', done: false },
                  { id: 'ls1c3', text: '学习产品设计的思维（如：《啊！设计》）', done: false },
                  { id: 'ls1c4', text: '学习美学理论与知识，懂得审美', done: false },
                  { id: 'ls1c5', text: '学习使用 AI 建模的知识', done: false }
                ]
              },
              { id: 'ls2', text: '学习宏观经济学知识，学会基本的经济学理论分析，利用经济学理论更好地进行投资和决策', done: false },
              { id: 'ls3', text: '不断提升文字写作与表达沟通的能力，通过读与听、说与写，更好地与他人合作来实现自己的目的', done: false },
              { id: 'ls4', text: '不断提升系统、逻辑、辩证、批判和演绎思维，让自己的决策与行为更趋于合理', done: false }
            ]
          },
          {
            id: 'learn-books', title: '阅读计划',
            items: [
              { id: 'bk1',  text: '《说话的逻辑与技巧》—— 学习说话基本功（6月阅读）', done: false },
              { id: 'bk2',  text: '《学哲学 用哲学》—— 把辩证法变成具体的工作方法（6月阅读）', done: true, doneAt: '2026-06-30' },
              { id: 'bk3',  text: '《宏观经济学二十五讲》—— 学习掌握宏观经济分析框架（6月下旬开始阅读）', done: false },
              { id: 'bk4',  text: '《系统之美》—— 学习提升系统思维能力', done: false },
              { id: 'bk5',  text: '《行政法与行政诉讼法》—— 了解行政法与行政诉讼法基础（7月阅读）｜后续可学：《行政法学》（胡建淼 著）、《行政法与行政诉讼原理与实务》（关保英 主编）', done: false },
              { id: 'bk6',  text: '《小镇喧嚣》—— 从真实案例了解基层政府的运转逻辑｜后续可安排：聂辉华《基层中国的运行逻辑》、兰小欢《置身事内》', done: false },
              { id: 'bk7',  text: '《万历十五年》', done: false },
              { id: 'bk8',  text: '《筚路蓝缕》', done: false },
              { id: 'bk9',  text: '《中国社会各阶层分析》', done: false },
              { id: 'bk10', text: '《非暴力沟通》', done: false },
              { id: 'bk11', text: '《修辞学发凡》', done: false }
            ]
          }
        ]
      }
    ]
  },

  /* ---------- 五、每日计划（首次打开自动生成今天的一份示例） ---------- */
  plans: {},

  /* ---------- 六、随记总结 ---------- */
  notes: [
    {
      id: 'note1',
      text: '开始使用个人工作台：把形势分析、目标清单、事项安排都放了进来，之后每天在这里做计划、记随记、写复盘。',
      keywords: ['工作台', '目标清单', '事项安排', '复盘'],
      createdAt: '2026-08-30 08:00'
    },
    {
      id: 'note2',
      text: '身体是 1，其他都是 0：痛风和体重问题是当前最优先要解决的事情，管住嘴、迈开腿、睡好觉。',
      keywords: ['痛风', '体重', '健康'],
      createdAt: '2026-08-30 08:05'
    }
  ]
};
