# 明日方舟一图流 网站前端

原域名<https://yituliu.site>因政策原因已被公安拿下<br>
可通过临时域名：<https://ytl.viktorlab.cn>访问<br>
也可通过新域名：<https://ark.yituliu.cn>访问


欢迎加入开发群（QQ）交流讨论：938710832
*本项目谢绝Gitcode搬运
---

# 项目框架和部分依赖

![](https://img.shields.io/badge/vite-@5.1.4-blue)
![](https://img.shields.io/badge/vue-@3.3.4-blue)
![](https://img.shields.io/badge/vue_router-@4.3.0-blue)
![](https://img.shields.io/badge/element_plus-@4.3.0-blue)
![](https://img.shields.io/badge/axios-@1.6.7-purple)
![](https://img.shields.io/badge/echarts-@5.0.0-red)

# 项目目录结构
项目的一些目录的作用，可能有遗漏或更新不及时的问题
```
├─docs———————————————————————文档目录
│ README.md  
│ vite.config.js—————————————vite配置文件   
├─src 源码
│   ├─api————————————————————存放一些抽象后的API便于复用，有统一的请求相应拦截
│   ├─assets—————————————————资源文件
│   │  └─css—————————————————样式文件
│   │      ├─layout——————————网站布局
│   │      ├─sprite——————————雪碧图
│   │      ├─material————————材料模块
│   │      ├─tool————————————工具模块
│   │      └─survey——————————调查模块
│   ├─components—————————————自定义组件（偏向布局，比如顶部导航栏）
│   ├─custom—————————————————自定义组件（偏向功能性，比如弹窗）
│   ├─pages——————————————————页面目录
│   │  ├─about———————————————网站信息页面目录
│   │  ├─dev—————————————————部分开发中页面目录
│   │  ├─material————————————材料相关页面目录
│   │  ├─survey——————————————干员调查页面目录
│   │  └─tools———————————————实用工具页面目录
│   ├─static—————————————————静态文件目录
│   │   └─json———————————————般是放一些数据的json格式文件
│   ├─utils——————————————————自定义工具函数
```
