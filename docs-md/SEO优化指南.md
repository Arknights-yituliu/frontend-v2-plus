# 本文档为 AI 生成，仅供参考

# SEO优化指南

## 已完成的SEO优化

### 1. 基础SEO配置
- ✅ 添加了完整的meta标签（title, description, keywords）
- ✅ 设置了正确的语言标识（zh-CN）
- ✅ 添加了author和robots meta标签
- ✅ 添加了canonical链接

### 2. 社交媒体优化
- ✅ Open Graph标签（Facebook、微信等）
  - og:title
  - og:description
  - og:image
  - og:url
  - og:type
  - og:locale
  - og:site_name
- ✅ Twitter Card标签
  - twitter:card
  - twitter:title
  - twitter:description
  - twitter:image

### 3. 结构化数据
- ✅ JSON-LD格式的结构化数据
- ✅ WebSite类型标记
- ✅ 搜索功能标记

### 4. 搜索引擎配置
- ✅ robots.txt文件
- ✅ sitemap.xml文件
- ✅ 自动生成sitemap的脚本

### 5. 动态SEO
- ✅ 路由变化时自动更新meta标签
- ✅ 每个页面独立的SEO配置
- ✅ 动态更新结构化数据

## 文件说明

### 核心文件
- `src/utils/seo.js` - SEO工具函数和配置
- `src/router/index.js` - 路由中集成SEO更新
- `index.html` - 包含基础SEO标签
- `public/robots.txt` - 搜索引擎爬虫规则
- `public/sitemap.xml` - 网站地图
- `scripts/generate-sitemap.js` - 自动生成sitemap脚本

## 使用方法

### 1. 配置网站基础信息
编辑 `src/utils/seo.js` 文件中的 `siteConfig` 对象：
```javascript
export const siteConfig = {
    siteName: '明日方舟一图流',
    siteUrl: 'https://www.yituliu.cn', // 替换为实际域名
    defaultDescription: '...',
    defaultKeywords: '...',
    defaultImage: '/logo.png', // 替换为实际图片
    twitterHandle: '@yituliu', // 替换为实际Twitter账号
    // ...
}
```

### 2. 为新页面添加SEO配置
在 `src/utils/seo.js` 的 `pageSEO` 对象中添加：
```javascript
export const pageSEO = {
    '/your/new/path': {
        title: '页面标题 - 明日方舟一图流',
        description: '页面描述',
        keywords: '关键词1,关键词2,关键词3'
    }
}
```

### 3. 更新sitemap
运行以下命令自动生成新的sitemap：
```bash
node scripts/generate-sitemap.js
```

或在 `package.json` 中添加脚本：
```json
{
  "scripts": {
    "generate:sitemap": "node scripts/generate-sitemap.js"
  }
}
```

然后运行：
```bash
npm run generate:sitemap
```

### 4. 在路由meta中添加页面标题
在 `src/router/routes.js` 中为每个路由添加 `meta.title`：
```javascript
{
    path: '/your/path',
    name: 'YourPage',
    component: YourComponent,
    meta: {
        title: '你的页面标题'
    }
}
```

## SEO最佳实践

### 1. 内容优化
- ✅ 使用语义化的HTML标签（h1, h2, h3, article, nav等）
- ✅ 图片添加alt属性
- ✅ 链接使用描述性文本
- ⚠️ 确保重要内容不依赖JavaScript渲染（考虑SSR）

### 2. 性能优化
- ⚠️ 优化图片大小和格式（使用WebP）
- ⚠️ 启用GZIP/Brotli压缩
- ⚠️ 使用CDN加速
- ⚠️ 实现懒加载
- ⚠️ 优化首屏加载时间

### 3. 移动端优化
- ✅ 响应式设计
- ✅ viewport meta标签
- ✅ 移动端适配

### 4. URL优化
- ✅ 使用有意义的URL路径
- ⚠️ 避免URL中的特殊字符
- ⚠️ 保持URL简短易读

### 5. 内部链接
- ⚠️ 建立良好的内部链接结构
- ⚠️ 使用面包屑导航
- ⚠️ 添加相关内容推荐

## 待优化项目

### 高优先级
1. **考虑实现SSR（服务端渲染）**
   - 使用Nuxt.js或手动配置Vue SSR
   - 提高首屏SEO效果和加载速度

2. **图片优化**
   - 添加所有图片的alt属性
   - 使用WebP格式
   - 实现图片懒加载

3. **性能优化**
   - 优化打包体积
   - 代码分割
   - 启用HTTP/2

### 中优先级
4. **添加面包屑导航**
   - 改善用户体验
   - 提供结构化数据

5. **优化页面加载速度**
   - 实现骨架屏
   - 优化首屏渲染

6. **添加404页面SEO**
   - 自定义404页面
   - 提供有用的导航链接

### 低优先级
7. **国际化SEO**
   - 如需支持多语言，添加hreflang标签

8. **AMP页面**
   - 考虑为移动端创建AMP版本

## 搜索引擎提交

完成SEO优化后，记得将网站提交到各大搜索引擎：

1. **Google Search Console**
   - 提交sitemap: https://search.google.com/search-console
   - 请求索引重要页面

2. **百度站长平台**
   - 提交sitemap: https://ziyuan.baidu.com/
   - 使用主动推送API

3. **必应网站管理员工具**
   - 提交sitemap: https://www.bing.com/webmasters

4. **其他搜索引擎**
   - 搜狗站长平台
   - 360站长平台

## 监控和分析

### 推荐工具
1. **Google Analytics** - 流量分析
2. **Google Search Console** - 搜索性能
3. **百度统计** - 国内流量分析
4. **Lighthouse** - 性能和SEO审计
5. **GTmetrix** - 性能测试

### 定期检查
- 检查robots.txt是否正确
- 验证sitemap是否被索引
- 监控关键词排名
- 分析用户行为数据
- 检查404错误
- 监控页面加载速度

## 注意事项

1. **URL配置**
   - 确保将 `siteUrl` 替换为实际的生产域名
   - 开发环境和生产环境使用不同的配置

2. **图片路径**
   - 确保社交分享图片使用绝对路径
   - 图片应该可以被爬虫访问

3. **定期更新**
   - 定期运行sitemap生成脚本
   - 保持meta信息更新
   - 监控SEO表现并调整策略

4. **避免重复内容**
   - 确保每个页面有唯一的title和description
   - 使用canonical标签处理重复内容

## 更多资源

- [Google SEO指南](https://developers.google.com/search/docs)
- [百度搜索引擎优化指南](https://ziyuan.baidu.com/college/courseinfo?id=267)
- [Web.dev SEO最佳实践](https://web.dev/lighthouse-seo/)
