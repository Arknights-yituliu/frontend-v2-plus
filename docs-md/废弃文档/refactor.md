## 一图流在特定移动端的一些BUG
目前项目的移动端适配全依靠下面这个标签，将页面加上一个0.68的缩放倍率
```
<meta name="viewport" content="width=device-width, initial-scale=0.68, maximum-scale=0.68, user-scalable=no" />
```
以攒抽计算器页面举例

攒抽计算器的折叠面板的宽度为
```
.collapse-card{
   width:550px
}
```
上面的标签将这个面板宽度缩放到了width:374px，刚好能符合iPhoneSE的可视宽度

但这个标签在森空岛的内置浏览器中，会出现下图的情况，页面被放大回了正常的大小

<img src="C:\VCProject\frontend-v2-plus\docs\image\森空岛内置浏览器.jpg" width="300"/>

该设备获取的window.innerWidth（视口宽度）和window.screen.width（设备宽度）
ps：我不太清楚这两个宽度属性正确翻译，上面是搜来的

<img src="C:\VCProject\frontend-v2-plus\docs\image\设备宽度.jpg" width="300"/>

目前打算将移动端的适配改为用媒体查询,但目前所有的页面都是按找1080px的宽度进行开发的，
所以很多宽度是被定死的，和上面的样式一样，是否需要挨个页面去重写这些样式

