# API

## 请求格式示例

### HTTP GET

|  名称   | 说明                              |
|:-----:|:--------------------------------|
| 请求URL | 	域名/API路径?参数名=参数值&参数名=参数值...... |

### HTTP POST:

|   名称   | 说明                                                              |
|:------:|:----------------------------------------------------------------|
| 请求 URL | 	域名/API路径                                                       |
|  请求体   | 	请求体可以使用 JSON 也可以使用 Form 表单, 需要注意的是, 请求的 Content-Type 是一定要设置准确的 |

HTTP POST JSON 格式:

```
{
    "参数名": "参数值",
    "参数名2": "参数值"
}
```

HTTP POST 表单格式:

```
param1=value&param2=value
```

# 材料相关

## 获取精英材料推荐刷取关卡 GET

### 路径：

```
backend.yituliu.cn/stage/t3
```

### 参数：

非必须

|      字段名       |  数据类型  |  默认值  | 数据类型                 |
|:--------------:|:------:|:-----:|:---------------------|
| expCoefficient | double | 0.625 | 认为经验书的价值为龙门币价值x0.625 |
|   sampleSize   |  int   |  300  | 样本量                  |

### 响应数据：

```json5
{
  // 状态码
  "code": 200,
  // 返回信息描述
  "msg": "操作成功",
  // 返回值
  "data": {
    // 更新日期
    "updateTime": "2024/06/30 10:01:22",
    // 每种精英材料的推荐关卡信息
    "recommendedStageList": [
      {
        // 材料系列，如环烃聚质 ，以蓝材料作为这类材料的代表，例如源岩、固源岩、固源岩组、提纯源岩等被称为固源岩组系材料
        "itemType": "固源岩组",
        // 材料系列id
        "itemTypeId": "30013",
        // 材料系列
        "itemSeries": "固源岩组",
        // 材料系列id（此处与 itemTypeId 作用相同，前端的兼容字段，）
        "itemSeriesId": "30013",
        // 版本
        "version": "v2-0.625-300",
        // 推荐关卡的集合，按关卡效率排列
        "stageResultList": [
          // 关卡信息详情
          {
            // 关卡id
            "stageId": "main_01-07",
            // 关卡名称
            "stageCode": "1-7",
            // 关卡类型
            "stageType": null,
            // 每分钟消耗理智
            "spm": 3.05,
            // 该关卡的主要掉落材料名称
            "itemName": "固源岩",
            // 该关卡的主要掉落材料id
            "itemId": "30012",
            // 该关卡的次要掉落材料id
            "secondaryItemId": "empty",
            // 期望理智
            "apExpect": 4.819211296651295,
            // 材料掉率
            "knockRating": 1.245017001883523,
            // 仅计算该系材料t1-t4等级材料的理智转化率
            "leT4Efficiency": 0.7604177376374756,
            // 仅计算该系材料t1-t3等级材料的理智转化率
            "leT3Efficiency": 0.7604177376374756,
            // 仅计算该系材料t1-t2等级材料的理智转化率
            "leT2Efficiency": 0.7604177376374756,
            // 该关卡全部掉落材料的理智转化率
            "stageEfficiency": 0.9999999241649382,
            // 样本量
            "sampleSize": 668040690,
            // 主材料置信度
            "sampleConfidence": 99.9,
            // 所属章节
            "zoneName": "第一章"
          }
        ]
      }
    ]
  }
}
```

## 获取搓玉推荐关卡 GET

### 路径：

```
backend.yituliu.cn/stage/orundum
```

### 参数：

```
本API无参数
```

### 响应数据：

```json5
{
  //状态码
  "code": 200,
  //返回信息描述
  "msg": "操作成功",
  //返回值
  "data": [
    {
      //关卡id
      "stageCode": "1-7",
      //所属章节
      "zoneName": "第一章",
      //不考虑其他消耗每理智可以转为多少玉
      "orundumPerAp": 1.089969524079855,
      //关卡的理智转化率
      "stageEfficiency": 0.999999935563614,
      //关卡的搓玉效率，以1-7为标准
      "orundumPerApEfficiency": 0.9999720404402339,
      //关卡类型
      "stageType": "MAIN",
      //每搓一抽合成玉需要的龙门币消耗
      "lmdcost": 9.535844273102738
    }
  ]
}
```

## 获取搓玉推荐关卡 GET

### 路径：

```
backend.yituliu.cn/stage/act
```

### 参数：

```
本API无参数
```

### 响应数据：

```json5
{
  //状态码
  "code": 200,
  //返回信息描述
  "msg": "操作成功",
  //返回值
  "data": [
    {
      // 活动名称
      "zoneName": "空想花庭·复刻",
      //关卡类型
      "stageType": "ACT_REP",
      //活动关卡信息
      "actStageList": [
        {
          // 关卡id
          "stageId": "act26side_08_rep",
          // 关卡名称
          "stageCode": "HE-8",
          // 该关卡的主要掉落材料id
          "itemId": "30103",
          // 该关卡的主要掉落材料名称
          "itemName": "RMA70-12",
          //期望理智
          "apExpect": 36.00586307894662,
          //掉率
          "knockRating": 0.5832383452093707,
          //关卡理智转化率
          "stageEfficiency": 1.1503097506541156
        }
      ],
      //活动结束日期
      "endTime": 1720123200000
    }
  ]
}
```

## 获取材料价值表 GET

### 路径：

```
backend.yituliu.cn/item/value
```

### 参数：

非必须

|      字段名       |  数据类型  |  默认值  | 数据类型                 |
|:--------------:|:------:|:-----:|:---------------------|
| expCoefficient | double | 0.625 | 认为经验书的价值为龙门币价值x0.625 |
|   sampleSize   |  int   |  300  | 样本量                  |

### 响应数据：

```json5
{
  //状态码
  "code": 200,
  //返回信息描述
  "msg": "操作成功",
  //返回值
  "data": [
    {
      "id": 1719884281685,
      //材料id
      "itemId": "30145",
      //材料名称
      "itemName": "晶体电子单元",
      //材料价值（单位：绿票）
      "itemValue": 403.770201,
      //材料价值（单位：理智）
      "itemValueAp": 323.016161,
      "type": "orange",
      //材料稀有度
      "rarity": 5,
      "cardNum": 12,
      "version": "v2-0.625-300",
      "weight": 0
    }
  ]
}
```

## 获取常驻材料商店性价比数据 GET

### 路径：

```
backend.yituliu.cn/store/perm
```

### 参数：

```
本API无参数
```

### 响应数据：

```json5
 {
  //状态码
  "code": 200,
  //返回信息描述
  "msg": "操作成功",
  //返回值
  "data": {
    //以商店货币颜色为分类
    "orange": [
      {
        "id": 28,
        //商店货币颜色
        "storeType": "orange",
        //材料名称
        "itemName": "炽合金",
        //材料id
        "itemId": "31023",
        //消耗理智
        "cost": 40,
        //性价比
        "costPer": 1.291,
        "quantity": 2,
        //材料等级
        "rarity": 3
      }
    ]
  }
}
```

## 获取常驻材料商店性价比数据 GET

### 路径：

```
backend.yituliu.cn/store/act
```

### 响应数据：

```json5
 {
  //状态码
  "code": 200,
  //返回信息描述
  "msg": "操作成功",
  //返回值
  "data": [
    {
      //商店结束日期
      "endTime": 1720454400000,
      //前端展示的标签
      "actTagArea": [
        {
          //标签内容
          "tagText": "来源：明日方舟一图流 ark.yituliu.cn 转载需保留本提示",
          //标签等级
          "tagRank": "5"
        }
      ],
      //图片链接
      "imageLink": "cos.yituliu.cn/image/store/1626290215840100.jpg",
      //商店性价比分级基准
      "actPPRBase": 2.5,
      //每一级的性价比区间
      "actPPRStair": 0.5,
      //活动名称
      "actName": "空想花庭复刻",
      //商品信息
      "actStore": [
        {
          //商店分区
          "itemArea": 1,
          //材料id
          "itemId": "30145",
          //材料名称
          "itemName": "晶体电子单元",
          //材料性价比
          "itemPPR": 3.23015308,
          //材料售价
          "itemPrice": 100,
          //材料数量
          "itemQuantity": 1,
        }
      ]
    }
  ]
}
```

## 获取礼包性价比数据 GET

### 路径：

```
backend.yituliu.cn/store/pack
```

### 参数：

```
本API无参数
```

### 响应数据：

```json5
{
  //状态码
  "code": 200,
  //返回信息描述
  "msg": "操作成功",
  //返回值
  "data": [
    {
      "id": 1615957244980109,
      //礼包的游戏官方名称
      "officialName": "罗德岛周年组合包2024",
      //礼包的前端展示名称
      "displayName": "罗德岛周年组合包2024",
      //售价
      "price": 328,
      //售卖类型
      "saleType": "activity",
      //礼包标签
      "tags": "activity,module,special",
      //礼包图片链接
      "imageLink": "image/pack/罗德岛周年组合包2024.jpg",
      //单抽
      "gachaTicket": 0,
      //十连
      "tenGachaTicket": 1,
      //源石
      "originium": 90,
      //合成玉
      "orundum": 0,
      //礼包抽数
      "draws": 37,
      //每抽价格
      "drawPrice": 8.864864864864865,
      //礼包全部内容等效多少源石
      "packedOriginium": 139.72865185185185,
      //每颗等效源石的价格
      "packedOriginiumPrice": 2.3474068893741564,
      //抽卡性价比
      "drawEfficiency": 1.3170731707317074,
      //礼包综合性价比
      "packEfficiency": 1.4921583124588003,
      //礼包内容
      "packContent": [
        {
          "id": 1615957244980111,
          //物品名称
          "itemName": "龙门币",
          //物品id
          "itemId": "4001",
          //物品数量
          "quantity": 260000
        },
        {
          "id": 1615957244980112,
          "itemName": "高级作战记录",
          "itemId": "2004",
          "quantity": 30
        },
        {
          "id": 1615957244980113,
          "itemName": "芯片助剂",
          "itemId": "32001",
          "quantity": 4
        },
        {
          "id": 1615957244980114,
          "itemName": "模组数据块",
          "itemId": "mod_unlock_token",
          "quantity": 4
        }
      ],
      //上架日期
      "start": 1714492800000,
      //下架日期
      "end": 1714492800000,
      //礼包描述
      "note": "含模组数据块"
    }
  ]
}
```

# 调查与统计

## 获取用户的干员练度信息 POST

### 路径：

```
backend.yituliu.cn/survey/operator/table
```

### 参数：

```json5
{
  token: "用户登录后服务器返回的用户凭证"
}
```

### 响应数据：

```json5
{
  //状态码
  "code": 200,
  //返回信息描述
  "msg": "操作成功",
  //返回值
  "data": [
    {
      //干员id
      "charId": "char_136_hsguma",
      //是否拥有
      "own": true,
      //干员等级
      "level": 90,
      //干员精英化等级
      "elite": 2,
      //干员潜能等级
      "potential": 6,
      //干员星级
      "rarity": 6,
      //干员通过技能等级
      "mainSkill": 7,
      //干员1技能等级
      "skill1": 0,
      //干员2技能等级
      "skill2": 3,
      //干员3技能等级
      "skill3": 0,
      //干员X分支模组等级
      "modX": 1,
      //干员Y分支模组等级
      "modY": 0,
      //干员D分支模组等级
      "modD": 0
    }
  ]
}
```

## 获取用户的干员练度信息 GET

### 路径：

```
backend.yituliu.cn/survey/operator/result
```

### 参数：

```
本API无参数
```

### 响应数据：

```json5
{
  "code": 200,
  "msg": "操作成功",
  "data": {
    //调查人数
    "userCount": 344.0,
    //更新时间
    "updateTime": "2024-07-02 18:00:27",
    //干员的练度调查结果
    "result": [
      {
        //干员id
        "charId": "char_002_amiya",
        //干员星级
        "rarity": 5,
        //持有率
        "own": 0.9883720930232558,
        //精英化等级比例,下述属性内部相同，不在赘述
        "elite": {
          //精英1
          "rank1": 0.011764705882352941,
          //精英2
          "rank2": 0.9882352941176471,
          //精英3
          "rank3": 0,
          //1到3级总占比
          "count": 1
        },
        //1技能专精等级比例
        "skill1": {
          "rank0": 0.9529411764705882,
          "rank1": 0.008823529411764706,
          "rank2": 0.0029411764705882353,
          "rank3": 0.03529411764705882,
          "count": 0.047058823529411764
        },
        //2技能专精等级比例
        "skill2": {
          "rank0": 0.9058823529411765,
          "rank1": 0.029411764705882353,
          "rank2": 0.011764705882352941,
          "rank3": 0.052941176470588235,
          "count": 0.09411764705882353
        },
        //3技能专精等级比例
        "skill3": {
          "rank0": 0.8058823529411765,
          "rank1": 0.058823529411764705,
          "rank2": 0.014705882352941176,
          "rank3": 0.12058823529411765,
          "count": 0.19411764705882353
        },
        //x分支模组等级比例
        "modX": {
          "rank0": 1,
          "rank1": 0,
          "rank2": 0,
          "rank3": 0,
          "count": 0
        },
        "modY": {
          "rank0": 0.8764705882352941,
          "rank1": 0.05588235294117647,
          "rank2": 0.008823529411764706,
          "rank3": 0.058823529411764705,
          "count": 0.12352941176470589
        },
        "modD": {
          "rank0": 1,
          "rank1": 0,
          "rank2": 0,
          "rank3": 0,
          "count": 0
        }
      }
    ]
  }
}
```

## 新增/更新种子  POST

### 路径：

```
backend.yituliu.cn/rogue-seed/upload
```

### 参数：

请求体

```json5
{
  //后端会根据这个判断是一个新种子还是旧种子，如果没有这个id则会进行新增种子操作
  "seed_id": 1681797491749,
  "seed": "12rui01o1ru01",
  "rogueVersion": "遁入阇那",
  "rogueTheme": "萨卡兹的无终奇语",
  "squad": "蓝图测绘分队",
  "operatorTeam": [
    "维什戴尔",
    "古米",
    "卡达"
  ],
  "tags": [
    "爽局",
    "目光呆滞"
  ],
  "description": "这是一个目光呆滞的ew爽局",
  "summaryImage": "static.yituliu.cn/114.jpg"
}

```

### 响应数据：

```json5


```

## 种子分页列表  POST

### 路径：

```
backend.yituliu.cn/rogue-seed/list
```

### 参数：

请求体

```json5
{
  //date,rating,time
  "orderBy": "date",
  "pageSize":50,
  "pageNum":1,
  "keyword": [
    "维什戴尔",
    "蓝图测绘分队",
    "爽局"
  ],
}
```

### 响应数据：

```json5
{
  "code": 200,
  "msg": "操作成功",
  "data": {
    "orderBY": "date",
    "keyword": [
      "维什戴尔",
      "蓝图测绘分队",
      "爽局"
    ],
    updateTime: 1514980148180,
    "list": [
      {
        "seed": "12rui01o1ru01",
        "rogueVersion": "遁入阇那",
        "rogueTheme": "萨卡兹的无终奇语",
        "squad": "蓝图测绘分队",
        "operatorTeam": [
          "维什戴尔",
          "古米",
          "卡达"
        ],
        "tags": [
          "爽局",
          "目光呆滞"
        ],
        "description": "这是一个目光呆滞的ew爽局",
        "summaryImage": "static.yituliu.cn/114.jpg"
      }
    ]
  }
}
```