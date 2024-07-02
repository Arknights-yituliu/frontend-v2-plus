# API

# 基础传输

请求一个 API 时, 包含了: API 终结点, 以及 API 所需参数.

### 请求说明

使用 HTTP GET:

|    名称     |             说明             |
|:---------:|:--------------------------:|
| 请求 URL 格式 | /终结点?参数名=参数值&参数名=参数值...... |

使用 HTTP POST:

|    名称     |     说明      |
|:---------:|:-----------:|
| 请求 URL 格式 |    /终结点     |
|    请求体    | 请求体一般为 JSON |

HTTP POST JSON 格式:

```
{
    "参数名": "参数值",
    "参数名2": "参数值"
}
```

### 响应说明

以下是响应的内容 <br>
其中 code（返回值），message（说明）字段：

|  返回值  |    说明    |
|:-----:|:--------:|
| 50002 |   数据错误   |
| 50001 |  数据未找到   |
|  404  | API 不存在  |
|  200  | 一般代表调用成功 |

data 字段：
API 的响应数据，一般是一个 JSON，部分情况为 String

# 参数及响应数据

下面是请求所需 params 和响应包含的 data 格式

### 获取蓝材料最优图(JsonArray)

终结点：`/stage/t3`
<br>
请求类型：Get

#### 参数

|      字段名       |  数据类型  | 默认值 |                        说明                         |
|:--------------:|:------:|:---:|:-------------------------------------------------:|
| expCoefficient | Double |  无  | 经验书系数 一般默认经验书价值为龙门币价值的 0.625 倍（也可选择 0.72 和 0.0 倍） |

#### 响应数据

|       字段名        |  数据类型   |                                说明                                |
|:----------------:|:-------:|:----------------------------------------------------------------:|
| stageEfficiency  | Double  | 与所有常驻关卡中，无活动加成时综合效率最高者相比，该关卡的效率为 103.6%。该效率是统计了所有产物的综合效率，长期最优的结果 |
|    stageCode     | String  |                             关卡的显示名称                              |
|     itemType     | String  |                           该关卡属于某一材料体系                            |
|   secondaryId    | String  |                        副产物的物品 ID，1 为无副产物                         |
| sampleConfidence | Double  |               样本量的置信度（误差不超过 3%的概率）为 99.9%，置信度过低的关卡               |
|   activityName   | String  |                             活动或章节名称                              |
|   knockRating    | Double  |                     主产物的掉率，短期急需该系材料的话参考意义较大                      |
|    updateTime    | String  |                             数据统计的时间                              |
|    sampleSize    | Integer |                               样本数量                               |
|    secondary     | String  |                         副产物的物品名称，1 为无副产物                         |
|     apExpect     | Double  |                     主产物的期望，短期急需该系材料的话参考意义较大                      |
|      itemId      | String  |                            主产物的物品 ID                             |
|       spm        | String  |                  SanityPerMinute，每分钟理论上可以消耗的理智                   |
|    stageColor    | Integer | 关卡标注颜色 橙色(双最优):4，紫色(综合效率最优):3，蓝色(普通关卡):2，绿色(主产物期望最优):1，红色(活动):-1 |

### 获取绿材料最优图(JsonArray)

终结点：`/stage/t2`
<br>
请求类型：Get

#### 参数

|      字段名       |  数据类型  | 默认值 |                        说明                         |
|:--------------:|:------:|:---:|:-------------------------------------------------:|
| expCoefficient | Double |  无  | 经验书系数 一般默认经验书价值为龙门币价值的 0.625 倍（也可选择 0.72 和 0.0 倍） |

#### 响应数据

|       字段名        |  数据类型   |                                说明                                |
|:----------------:|:-------:|:----------------------------------------------------------------:|
| stageEfficiency  | Double  |        与所有常驻关卡中，无活动加成时综合效率最高者相比。该效率是统计了所有产物的综合效率，长期最优的结果         |
|    stageCode     | String  |                             关卡的显示名称                              |
|     itemType     | String  |                           该关卡属于某一材料体系                            |
|   secondaryId    | String  |                        副产物的物品 ID，1 为无副产物                         |
| sampleConfidence | Double  |               样本量的置信度（误差不超过 3%的概率）为 99.9%，置信度过低的关卡               |
|   activityName   | String  |                             活动或章节名称                              |
|   knockRating    | Double  |                     主产物的掉率，短期急需该系材料的话参考意义较大                      |
|    updateTime    | String  |                             数据统计的时间                              |
|    sampleSize    | Integer |                               样本数量                               |
|    secondary     | String  |                         副产物的物品名称，1 为无副产物                         |
|     apExpect     | Double  |                     主产物的期望，短期急需该系材料的话参考意义较大                      |
|      itemId      | String  |                            主产物的物品 ID                             |
|       spm        | String  |                  SanityPerMinute，每分钟理论上可以消耗的理智                   |
|    stageColor    | Integer | 关卡标注颜色 橙色(双最优):4，紫色(综合效率最优):3，蓝色(普通关卡):2，绿色(主产物期望最优):1，红色(活动):-1 |

### 获取常驻商店性价比(JsonObject)

终结点：`/store/perm`
<br>
请求类型：Get

#### 参数

> 该 API 无需参数

#### 响应数据
|    数据类型    |    字段名    |  说明   |
|:----------:|:---------:|:-----:|
| JSONObject | StoreType | 商店的类型 |

其中`StoreType`字段包含7个字段

|  数据类型  |    字段名    |     说明      |
|:------:|:---------:|:-----------:|
| String |  itemId   |    物品 id    |
| String | itemName  |    物品名称     |
| Double |   cost    |    单位售价     |
| String | quantity  | 商店商品每次的售卖数量 |
| Double |  costPer  |     性价比     |
| rarity |  String   |    物品稀有度    |
| String | storeType |    商店类型     |

### 获取活动商店性价比(JsonArray)

终结点：`/store/act`
<br>
请求类型：Get

#### 参数
> 该 API 无需参数
#### 响应数据

|     字段名      |  数据类型  |    说明     |
|:------------:|:------:|:---------:|
| actStartData |  Long  |  活动开始时间   |
|  actEndData  |  Long  |  活动结束时间   |
|   actName    | String |   活动名称    |
|  actTagArea  | String |           |
|  actPPRBase  | Double |  商店原始售价   |
| actPPRStair  | String |    性价比    |
|   actStore   | Object | 商店性价比具体内容 |

其中`actStore`字段包含6个字段

|     字段名      |  数据类型   |          说明          |
|:------------:|:-------:|:--------------------:|
|   itemArea   | Integer | 区域索引，用于判断是无限池区还是有限池区 |
|   itemName   | String  |         材料名称         |
|   itemPPR    | Double  |        材料性价比         |
|  itemPrice   | Integer |         商店售价         |
| itemQuantity | Integer |       商店每次售卖个数       |
|  itemStock   | Integer |         商店库存         |

### 获取所有物品价值(JsonArray)

终结点：`/item/value`
<br>
请求类型：Get

#### 参数

|      字段名       |  数据类型  | 默认值 |                        说明                         |
|:--------------:|:------:|:---:|:-------------------------------------------------:|
| expCoefficient | Double |  无  | 经验书系数 一般默认经验书价值为龙门币价值的 0.625 倍（也可选择 0.72 和 0.0 倍） |

#### 响应数据

|     字段名     |  数据类型   |     说明     |
|:-----------:|:-------:|:----------:|
|   itemId    | String  |    物品id    |
|  itemName   | String  |    物品名称    |
|  itemValue  | Double  | 物品价值（单位绿票） |
| itemValueAp | Double  | 物品价值（单位理智） |
|    type     | String  |   物品稀有度    |
|   rarity    | Integer |   物品稀有度    |
|   cardNum   | Integer |  前端排序的用索引  |

### 获取历史活动最优图(JsonArray)

终结点：`/stage/closed`
<br>
请求类型：Get

#### 参数

|      字段名       |  数据类型  | 默认值 |                        说明                         |
|:--------------:|:------:|:---:|:-------------------------------------------------:|
| expCoefficient | Double |  无  | 经验书系数 一般默认经验书价值为龙门币价值的 0.625 倍（也可选择 0.72 和 0.0 倍） |

#### 响应数据

|       字段名        |  数据类型   |                                说明                                |
|:----------------:|:-------:|:----------------------------------------------------------------:|
| stageEfficiency  | Double  | 与所有常驻关卡中，无活动加成时综合效率最高者相比，该关卡的效率为 103.6%。该效率是统计了所有产物的综合效率，长期最优的结果 |
|    stageCode     | String  |                             关卡的显示名称                              |
|     itemType     | String  |                           该关卡属于某一材料体系                            |
|   secondaryId    | String  |                        副产物的物品 ID，1 为无副产物                         |
| sampleConfidence | Double  |               样本量的置信度（误差不超过 3%的概率）为 99.9%，置信度过低的关卡               |
|   activityName   | String  |                             活动或章节名称                              |
|   knockRating    | Double  |                     主产物的掉率，短期急需该系材料的话参考意义较大                      |
|    updateTime    | String  |                             数据统计的时间                              |
|    sampleSize    | Integer |                               样本数量                               |
|    secondary     | String  |                         副产物的物品名称，1 为无副产物                         |
|     apExpect     | Double  |                     主产物的期望，短期急需该系材料的话参考意义较大                      |
|      itemId      | String  |                            主产物的物品 ID                             |
|       spm        | String  |                  SanityPerMinute，每分钟理论上可以消耗的理智                   |
|    stageColor    | Integer | 关卡标注颜色 橙色(双最优):4，紫色(综合效率最优):3，蓝色(普通关卡):2，绿色(主产物期望最优):1，红色(活动):-1 |

