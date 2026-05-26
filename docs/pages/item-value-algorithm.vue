<script setup>
import ItemImage from "/src/components/sprite/ItemImage.vue";
</script>

<template>
  <div>
    <h1 id="物品价值算法">物品价值算法</h1>
    <v-divider></v-divider>

    <p>本文介绍一图流如何计算物品理智价值。前端实现主要可参考 <v-code>/src/utils/item/itemValue.js</v-code>。</p>
    <v-alert border variant="tonal" type="info">
      <p>本文前半部分介绍精英材料价值的迭代算法，后半部分介绍龙门币、寻访资源、芯片、碳、技巧概要等辅助物品的估值方式。通用阅读约定见 <a href="/docs/algorithm#前置条件">算法总览：前置条件</a>。</p>
    </v-alert>

    <h2 id="算法目标">算法目标</h2>
    <v-divider></v-divider>

    <ol>
      <li>为精英材料、龙门币、EXP、寻访资源、芯片、技巧概要等物品提供统一价值。</li>
      <li>保证定价作战集内的作战效率不超过 100%。</li>
      <li>让每个材料系列至少存在 1 个主产作战作为价值锚点。</li>
      <li>让精英材料加工配方的消耗总价值与产出总价值保持平衡。</li>
    </ol>

    <h2 id="核心思路">核心思路</h2>
    <v-divider></v-divider>

    <p>精英材料价值以<span class="blue">蓝</span>材料为核心变量。算法先给<span class="blue">蓝</span>材料和加工副产品价值设定初始值，再根据加工配方推出其他稀有度精英材料的价值，随后计算定价作战集中的作战效率，并据此修正<span class="blue">蓝</span>材料价值。</p>
    <p>这一过程会重复迭代，直到材料价值和作战效率收敛。下面会逐步展开定价作战集、自定义价值、加工配方、副产品价值和迭代修正的具体计算方式。</p>

    <h2 id="精英材料价值">精英材料价值</h2>
    <v-divider></v-divider>

    <p>明日方舟一图流算法按照以下步骤计算精英材料的价值。在计算精英材料的价值时，会用到龙门币、EXP、赤金等其他物品的价值，这些物品的价值需要提前算出。</p>
    <p>概括来说，计算流程如下：</p>
    <ol>
      <li>确定定价作战集与自定义物品价值。</li>
      <li>设定<span class="blue">蓝</span>材料价值和副产品价值初始值。</li>
      <li>通过加工配方推出全部精英材料价值。</li>
      <li>计算副产品价值期望与作战效率。</li>
      <li>修正<span class="blue">蓝</span>材料价值，并重复迭代直到收敛。</li>
    </ol>

    <h3 id="确定定价作战集和自定义物品价值">1. 确定定价作战集和自定义物品价值</h3>
    <v-divider></v-divider>

    <ul>
      <li>
        <p><b><span class="red">定价作战集</span></b>指用于物品价值计算的基准作战。定价作战集以外的作战不会参与物品价值计算。</p>
        <p>通常，定价作战集包含样本数足够的常驻作战。博士可以根据个人需求来选择定价作战集是否包含历史活动作战。</p>
        <p>根据 <a href="https://space.bilibili.com/37179776" target="_blank" rel="noopener noreferrer">BioHazard</a> 的文章 <a href="https://www.bilibili.com/read/cv39716633/" target="_blank" rel="noopener noreferrer">SideStory 作战历史掉率</a>，可以认为<b>同一种<span class="blue">蓝</span>材料在不同 SideStory 作战中的<span class="purple">单位理智掉落数量</span>以及<span class="purple">单件期望理智</span>是<span class="red">固定的数</span>，不会随着作战的不同而改变。</b></p>
        <p>因此，明日方舟一图流对每种曾经在 SideStory 作战中出现过的<span class="blue">蓝</span>材料都创建了一个虚拟作战，其掉率取为历史上掉这种<span class="blue">蓝</span>材料的 SideStory 作战的<b>平均掉率</b>。</p>
      </li>
      <li>
        <p>物品可以<b>自定义价值</b>。明日方舟一图流默认为<b>活动商店无限池中的材料</b>自定义价值。</p>
        <p><b>活动商店无限池中的材料</b>价值根据活动商店来确定，即<b>认为活动代币兑换无限龙门币与兑换无限池材料的<span class="red">性价比相同</span>。</b></p>
        <ul>
          <li>扭转醇价值 = 25 × 20 × 龙门币价值，</li>
          <li>轻锰矿价值 = 30 × 20 × 龙门币价值。</li>
        </ul>
        <p>其他活动商店无限池中的材料价值可以类似计算。</p>
      </li>
      <v-alert border variant="tonal" type="info">
        定价作战集和自定义物品价值可以在 <a href="/account/home">个人中心</a> 中设置。
      </v-alert>
    </ul>

    <h3 id="设定初始值">2. 设定初始值</h3>
    <v-divider></v-divider>

    <ul>
      <li>除已经自定义的<span class="blue">蓝</span>材料外，给每种其他<span class="blue">蓝</span>材料的价值分别设定初始值。</li>
      <li>
        <p>加工精英材料可能获得随机副产品，副产品的稀有度比目标材料的稀有度低一个等级（比如用<span class="blue">蓝</span>材料加工<span class="purple">紫</span>材料时，副产品为<span class="blue">蓝</span>材料）。</p>
        <p>给加工<span class="green">绿</span>、<span class="blue">蓝</span>、<span class="purple">紫</span>、<span class="yellow">金</span>材料时副产品价值的期望分别设定初始值。</p>
      </li>
    </ul>
    <v-alert border variant="tonal" type="info">
      <p>初始值可写入任意正值。</p>
      <p><span class="blue">蓝</span>材料价值的初始值推荐使用绿票商店售价 × 0.8，可以更快收敛。</p>
    </v-alert>

    <h3 id="计算所有精英材料的价值">3. 计算所有精英材料的价值</h3>
    <v-divider></v-divider>

    <p>在已知所有<span class="blue">蓝</span>材料价值的情况下，根据加工配方，计算<span class="gray">白</span>、<span class="green">绿</span>、<span class="purple">紫</span>、<span class="yellow">金</span>材料的价值。</p>
    <v-alert border>
      <b>思想：所有精英材料配方的<span class="red">消耗总价值</span>等于<span class="red">产出总价值</span></b>
    </v-alert>

    <h4 id="计算所有精英材料的价值-计算示例">计算示例</h4>

    <p>以装置系材料为例。其他精英材料的价值可以类似算出。</p>
    <ul>
      <li>设 θ 为加工精英材料时的副产品产出概率（使用年、芳汀、白铁加工精英材料时，θ = 20%）。</li>
    </ul>
    <ol>
      <li>
        <p><b><span class="green">装置</span>的价值</b></p>
        <p>已知<span class="blue">全新装置</span>的加工配方为</p>
        <v-alert border>
          4 <span class="green">装置</span> + 200 龙门币 → 1 <span class="blue">全新装置</span> + θ 随机<span class="green">绿</span>材料，
        </v-alert>
        <p>把配方中的“→”改成“=”，移项得到</p>
        <v-alert border>
          <span class="green">装置</span>价值 = (<span class="blue">全新装置</span>价值 - 200 × 龙门币价值 + θ × 加工<span class="blue">蓝</span>材料时副产品价值的期望) ÷ 4
        </v-alert>
      </li>
      <li>
        <p><b><span class="purple">改量装置</span>的价值</b></p>
        <p>已知<span class="purple">改量装置</span>的加工配方为</p>
        <v-alert border>
          1 <span class="blue">全新装置</span> + 2 固源岩组 + 1 研磨石 + 300 龙门币 → 1 <span class="purple">改量装置</span> + θ 随机<span class="blue">蓝</span>材料，
        </v-alert>
        <p>得到</p>
        <v-alert border>
          <span class="purple">改量装置</span>价值 = <span class="blue">全新装置</span>价值 + 2 × 固源岩组价值 + 研磨石价值 + 300 × 龙门币价值 - θ × 加工<span class="purple">紫</span>材料时副产品价值的期望。
        </v-alert>
      </li>
    </ol>

    <h3 id="计算副产品价值的期望">4. 计算副产品价值的期望</h3>
    <v-divider></v-divider>

    <p>使用上一步计算出的所有精英材料的价值，计算加工<span class="green">绿</span>、<span class="blue">蓝</span>、<span class="purple">紫</span>、<span class="yellow">金</span>材料时副产品价值的期望。</p>
    <v-alert border variant="tonal" type="info">
      <p>加工产出副产品时，各种副产品的出现概率各不相同。</p>
      <p>加工特定材料时，各种副产品的出现概率可以在 <a href="https://prts.wiki/w/%E5%9B%BA%E6%BA%90%E5%B2%A9" target="_blank" rel="noopener noreferrer">PRTS Wiki</a> 目标材料页面中找到。</p>
    </v-alert>

    <h4 id="计算副产品价值的期望-计算示例">计算示例</h4>

    <p>例如，加工<span class="green">绿</span>材料时，副产品为<span class="gray">白</span>材料。根据各种<span class="gray">白</span>材料的价值以及各种<span class="gray">白</span>材料作为副产品的概率，计算加工<span class="green">绿</span>材料时副产品价值的期望。（数值仅为示例，非准确值）</p>

    <v-card>
      <v-table class="freeze-table-first-column">
        <thead>
          <tr>
            <th>物品</th>
            <th>名称</th>
            <th>作为副产品的概率</th>
            <th>单件价值</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><ItemImage item-id="30011"/></td>
            <td>源岩</td>
            <td>26.32%</td>
            <td>1.1471</td>
          </tr>
          <tr>
            <td><ItemImage item-id="30021"/></td>
            <td>代糖</td>
            <td>17.54%</td>
            <td>1.6133</td>
          </tr>
          <tr>
            <td><ItemImage item-id="30031"/></td>
            <td>酯原料</td>
            <td>17.54%</td>
            <td>1.6133</td>
          </tr>
          <tr>
            <td><ItemImage item-id="30041"/></td>
            <td>异铁碎片</td>
            <td>14.04%</td>
            <td>2.0119</td>
          </tr>
          <tr>
            <td><ItemImage item-id="30051"/></td>
            <td>双酮</td>
            <td>14.04%</td>
            <td>2.0097</td>
          </tr>
          <tr>
            <td><ItemImage item-id="30061"/></td>
            <td>破损装置</td>
            <td>10.53%</td>
            <td>2.6838</td>
          </tr>
          <tr>
            <td></td>
            <td></td>
            <td><b>副产品价值期望</b></td>
            <td><b>1.7149</b></td>
          </tr>
        </tbody>
      </v-table>
    </v-card>

    <h3 id="计算作战期望掉落物品的总价值">5. 计算作战期望掉落物品的总价值</h3>
    <v-divider></v-divider>

    <p>根据 <a href="https://penguin-stats.io/" target="_blank" rel="noopener noreferrer">企鹅物流数据统计</a> 的掉率数据，对于每个作战，计算期望掉落物品的总价值，进而计算作战效率。</p>
    <v-alert border>
      <p><b>作战效率 = 作战期望掉落物品的总价值 ÷ 作战的理智消耗</b></p>
    </v-alert>

    <h4 id="计算作战期望掉落物品的总价值-计算示例">计算示例</h4>

    <p>计算主题曲 12-17 的期望掉落物品的总价值和作战效率（数值仅为示例，非准确值）。</p>
    <v-card>
      <v-table class="freeze-table-first-column">
        <thead>
          <tr>
            <th>物品</th>
            <th>名称</th>
            <th>单件价值</th>
            <th>期望掉落数</th>
            <th>期望总价值</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><ItemImage item-id="4001"/></td>
            <td>龙门币</td>
            <td>0.004</td>
            <td>252</td>
            <td>0.907</td>
          </tr>
          <tr>
            <td><ItemImage item-id="31054"/></td>
            <td>切削原液</td>
            <td>79.245</td>
            <td>0.048</td>
            <td>3.813</td>
          </tr>
          <tr>
            <td><ItemImage item-id="3003"/></td>
            <td>赤金</td>
            <td>0.912</td>
            <td>0.1</td>
            <td>0.091</td>
          </tr>
          <tr>
            <td><ItemImage item-id="31013"/></td>
            <td>凝胶</td>
            <td>32</td>
            <td>0.016</td>
            <td>0.502</td>
          </tr>
          <tr>
            <td><ItemImage item-id="30062"/></td>
            <td>装置</td>
            <td>9.851</td>
            <td>0.145</td>
            <td>1.431</td>
          </tr>
          <tr>
            <td><ItemImage item-id="30073"/></td>
            <td>扭转醇</td>
            <td>1.8</td>
            <td>0.02</td>
            <td>0.037</td>
          </tr>
          <tr>
            <td><ItemImage item-id="31053"/></td>
            <td>化合切削液</td>
            <td>32</td>
            <td>0.47</td>
            <td>15.029</td>
          </tr>
          <tr>
            <td><ItemImage item-id="30012"/></td>
            <td>固源岩</td>
            <td>4.851</td>
            <td>0.364</td>
            <td>1.765</td>
          </tr>
          <tr>
            <td><ItemImage item-id="30013"/></td>
            <td>固源岩组</td>
            <td>20</td>
            <td>0.026</td>
            <td>0.514</td>
          </tr>
          <tr>
            <td><ItemImage item-id="30063"/></td>
            <td>全新装置</td>
            <td>36</td>
            <td>0.012</td>
            <td>0.432</td>
          </tr>
          <tr>
            <td><ItemImage item-id="30011"/></td>
            <td>源岩</td>
            <td>1.377</td>
            <td>0.215</td>
            <td>0.297</td>
          </tr>
          <tr>
            <td><ItemImage item-id="30061"/></td>
            <td>破损装置</td>
            <td>3.044</td>
            <td>0.086</td>
            <td>0.26</td>
          </tr>
          <tr>
            <td><ItemImage item-id="31073"/></td>
            <td>褐素纤维</td>
            <td>32</td>
            <td>0.016</td>
            <td>0.512</td>
          </tr>
          <tr>
            <td></td>
            <td></td>
            <td></td>
            <td><b>作战掉落总价值</b></td>
            <td><b>25.59</b></td>
          </tr>
          <tr>
            <td></td>
            <td></td>
            <td></td>
            <td>作战消耗理智</td>
            <td>21</td>
          </tr>
          <tr>
            <td></td>
            <td></td>
            <td></td>
            <td><b>作战效率</b></td>
            <td><b>121.86%</b></td>
          </tr>
        </tbody>
      </v-table>
    </v-card>

    <h3 id="修正蓝材料的价值">6. 修正蓝材料的价值</h3>
    <v-divider></v-divider>

    <v-alert border>
      <b>思想：</b>
      <ol>
        <li><b>定价作战集中的所有作战效率 ≤ 1；</b></li>
        <li><b>对于每一系列材料，在定价作战集中至少存在 1 个以该系列材料为主产物且效率等于 1 的作战。</b></li>
      </ol>
    </v-alert>
    <p>固定一类材料，在定价作战集中寻找以该系列材料为主产物的所有作战，取其中作战效率最高的那个作战，作战效率记为 E。然后把对应的<span class="blue">蓝</span>材料的价值进行修正，将对应<span class="blue">蓝</span>材料的价值除以 E，得到新的价值。</p>
    <p>这个步骤需要对每系列材料都做一遍（除了已经在步骤 1 自定义价值的材料）。</p>

    <h4 id="修正蓝材料的价值-计算示例">计算示例</h4>

    <p>以切削液系材料为例。</p>
    <p>上一步已经计算出了主题曲 12-17 的作战效率为 121.86%。假设这就是以切削液系材料为主产物的作战中，效率最高的那个。</p>
    <p>此时需要把化合切削液的价值除以 121.86%，得到新的化合切削液价值。</p>

    <h3 id="迭代直到收敛">7. 迭代直到收敛</h3>
    <v-divider></v-divider>

    <p>重复步骤 3、4、5、6，直到满足停机准则。</p>
    <p><b>停机准则：对于每种未自定义价值的<span class="blue">蓝</span>材料，定价作战集中以该系列材料为主产物的最高效率作战的作战效率在 (99.99%, 100.01%) 之间。</b></p>

    <h2 id="其他物品价值">其他物品价值</h2>
    <v-divider></v-divider>
    <p>本节列出的物品价值主要作为计算作战掉落总价值、礼包性价比和商店性价比时的基础输入；其中部分物品也会在精英材料价值计算过程中作为已知量使用。</p>

    <h3 id="寻访资源">寻访资源</h3>
    <v-divider></v-divider>

    <ul>
      <li>至纯源石价值 = 135</li>
      <li>合成玉价值 = 至纯源石价值 ÷ 180</li>
      <li>寻访凭证价值 = 600 × 合成玉价值</li>
      <li>十连寻访凭证价值 = 10 × 寻访凭证价值</li>
      <li><span class="yellow">高级凭证</span>价值 = 38 ÷ 258 × 寻访凭证价值</li>
      <li>中坚寻访凭证价值 = 216 ÷ 38 × <span class="yellow">高级凭证</span>价值</li>
      <li>十连中坚寻访凭证价值 = 10 × 中坚寻访凭证价值</li>
    </ul>
    <v-alert border variant="tonal" type="info">
      <p>自定义合成玉价值、中坚寻访凭证价值的功能正在开发中。</p>
      <p>搓玉的博士可以根据搓玉成本确定合成玉价值。此时<br/>
        合成玉价值 = (2 × 固源岩价值 + 1600 × 龙门币价值 + 40 × 无人机价值) ÷ 10。</p>
    </v-alert>

    <h3 id="家具零件、加急许可">家具零件、加急许可</h3>
    <v-divider></v-divider>

    <p>认为家具零件、加急许可的价值为 0。</p>

    <h3 id="龙门币、作战记录、无人机、赤金">龙门币、作战记录、无人机、赤金</h3>
    <v-divider></v-divider>

    <ul>
      <li>龙门币价值 = (36 ÷ 10000) × 龙门币价值系数</li>
      <li>EXP 价值 = (36 ÷ 10000) × 经验书价值系数</li>
    </ul>
    <v-alert border variant="tonal" type="info">
      龙门币价值系数和经验书价值系数可以在 <a href="/account/home">个人中心</a> 中设置。
    </v-alert>
    <ul>
      <li><span class="green">基础作战记录</span>价值 = 200 × EXP 价值</li>
      <li><span class="blue">初级作战记录</span>价值 = 400 × EXP 价值</li>
      <li><span class="orange">中级作战记录</span>价值 = 1000 × EXP 价值</li>
      <li><span class="yellow">高级作战记录</span>价值 = 2000 × EXP 价值</li>
      <li>无人机价值 = EXP 价值 × 无人机生产 EXP 数量 = EXP 价值 × (180 ÷ 10800 × 1000)</li>
      <li>赤金价值 = 无人机价值 ÷ 无人机生产赤金数量 = 无人机价值 ÷ (180 ÷ 4320)</li>
    </ul>

    <h4 id="如何确定龙门币价值系数与经验书价值系数？">如何确定龙门币价值系数与经验书价值系数？</h4>

    <p>龙门币价值可以根据 <b>CE-6</b> 来确定，即 36 理智 = 10000 龙门币，1 龙门币 = (9 / 2500) 理智。</p>
    <p>EXP 价值有多种方法来确定。</p>
    <p>对于刷 LS-6 的博士来说，36 理智 = 10000 EXP + (36 × 12) 龙门币，EXP 价值 = 36 × (1 - 12 × 龙门币价值) ÷ 10000。</p>
    <p>对于不刷 LS-6 的博士来说，可以通过基建来确定 EXP 的价值。</p>
    <p>在基建中，可以把<b>无人机看作一般等价物</b>。假如加速 1 龙门币所需要的无人机是加速 1 EXP 所需要的无人机的 x 倍，那么按照无人机是等价物的观点，龙门币的价值就是 EXP 的 x 倍。x 称为“钱书价值比”。</p>
    <p>还有一种理解方法：假如少加速 1 龙门币省下来的无人机可以用来加速 x EXP，那么把这 1 龙门币和 x EXP 视为价值相同，即认为龙门币的价值是 EXP 的 x 倍。</p>
    <p>下面我们来具体计算 x。以 <b>3 级贸易站，不使用龙舌兰、但书、裁缝类技能为例。</b></p>
    <p>为了加速 1000 EXP，需要消耗 60 无人机。而想要使用无人机获取 1000 龙门币，则需要先在制造站中消耗 48 无人机加速 2 赤金，再在贸易站中消耗 1356 / 29 = 46.7586 无人机加速贵金属订单，总共需要消耗 2748 / 29 = 94.7586 无人机。</p>
    <p>将二者相除，得到加速 1 龙门币所需要的无人机是加速 1 EXP 所需要的无人机的 229 / 145 = 1.5793 倍，因此龙门币的价值是 EXP 的 229 / 145 = 1.5793 倍。</p>
    <p>明日方舟一图流的<b>默认</b>经验书价值系数就是这么算出来的，等于 145 / 229 = 0.6332。</p>

    <v-alert border variant="tonal" type="info" title="46.7586 是怎么算出来的？">
      <p>3 级贸易站，不使用龙舌兰、但书、裁缝类技能的情况下，</p>
      <ul>
        <li>2 赤金订单的出现概率为 30%，消耗 2 赤金，获得 1000 龙门币，加速完成需要 48 无人机；</li>
        <li>3 赤金订单的出现概率为 50%，消耗 3 赤金，获得 1500 龙门币，加速完成需要 70 无人机；</li>
        <li>4 赤金订单的出现概率为 20%，消耗 4 赤金，获得 2000 龙门币，加速完成需要 92 无人机。</li>
      </ul>
      <p>加速完成 1 笔订单，需要的无人机数量期望为 30% × 48 + 50% × 70 + 20% × 92 = 339 / 5 = 67.8，获得的龙门币数量期望为 30% × 1000 + 50% × 1500 + 20% × 2000 = 1450。</p>
      <p>因此，为了加速 1000 龙门币的订单，平均需要的无人机数量为 1000 ÷ 1450 × (339 / 5) = 1356 / 29 = 46.7586。</p>
    </v-alert>

    <p>不同博士的基建布局、使用龙舌兰、但书、裁缝类技能的情况各不相同。其他情况下的钱书价值比，可以参考 <a href="https://space.bilibili.com/37179776" target="_blank" rel="noopener noreferrer">BioHazard</a> 的文章 <a href="https://www.bilibili.com/read/cv28230294/" target="_blank" rel="noopener noreferrer">各情形下贸易站数据</a>。文章中的“钱书基础工时成本比”就是这里的“钱书价值比”。</p>

    <h3 id="采购凭证、芯片相关材料、模组数据块、事相碎片">采购凭证、芯片相关材料、模组数据块、事相碎片</h3>
    <v-divider></v-divider>

    <ul>
      <li>采购凭证价值 = AP-5消耗理智 × (1 - 12 × 龙门币价值) ÷ AP-5 掉落采购凭证数量 = 30 × (1 - 12 × 龙门币价值) ÷ 21</li>
      <li>芯片价值 = 18 × (1 - 12 × 龙门币价值)</li>
      <li>芯片组价值 = 36 × (1 - 12 × 龙门币价值)</li>
      <li>芯片助剂价值 = 90 × 采购凭证价值</li>
      <li>双芯片价值 = 2 × 芯片组价值 + 芯片助剂价值 + 1 ÷ 180 × 无人机价值</li>
      <li>模组数据块价值 = 120 × 采购凭证价值</li>
      <li>事相碎片价值 = 20 × 采购凭证价值</li>
    </ul>

    <h4 id="芯片类材料价值的进一步讨论">芯片类材料价值的进一步讨论</h4>
    <p><a href="https://space.bilibili.com/688411531" target="_blank" rel="noopener noreferrer">逻辑元LogicalByte</a>（当时账号名称为“罗德岛基建BETA”）于 2024-11-06 发布 <a href="https://t.bilibili.com/996644575476973568" target="_blank" rel="noopener noreferrer">投票“平时会合成芯片吗？”</a>。</p>
    <p>参与投票的博士中，68% 的博士选择了“缺啥合啥！小亏就小亏！”选项。</p>
    <img src="/docs/public/image/docs/投票“平时会合成芯片吗？”.png" alt="投票“平时会合成芯片吗？”" style="width: 600px;"/>
    <p>对于这部分博士，可以认为<b>各芯片的价值相等</b>。明日方舟一图流就是这么做的。</p>
    <p>另一个选项是“只合特定芯片！反向不合！（什么职业队）”。选择这个选项的博士也许是考虑到了<b>各芯片的需求量存在差异</b>。</p>
    <p>我们列出<b>全干员满练</b>需求的芯片类材料数量（开服 ~ 2025-05「众生行记」版本（含））。</p>
    <v-card>
      <v-table style="white-space: nowrap;">
      <thead>
        <tr>
          <th>物品</th>
          <th>名称</th>
          <th>需求数量</th>
          <th>物品</th>
          <th>名称</th>
          <th>需求数量</th>
          <th>物品</th>
          <th>名称</th>
          <th>需求数量</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><ItemImage item-id="3213"/></td>
          <td>先锋双芯片</td>
          <td>87</td>
          <td><ItemImage item-id="3212"/></td>
          <td>先锋芯片组</td>
          <td>25</td>
          <td><ItemImage item-id="3211"/></td>
          <td>先锋芯片</td>
          <td>128</td>
        </tr>
        <tr>
          <td><ItemImage item-id="3223"/></td>
          <td>近卫双芯片</td>
          <td>190</td>
          <td><ItemImage item-id="3222"/></td>
          <td>近卫芯片组</td>
          <td>75</td>
          <td><ItemImage item-id="3221"/></td>
          <td>近卫芯片</td>
          <td>290</td>
        </tr>
        <tr>
          <td><ItemImage item-id="3233"/></td>
          <td>重装双芯片</td>
          <td>105</td>
          <td><ItemImage item-id="3232"/></td>
          <td>重装芯片组</td>
          <td>30</td>
          <td><ItemImage item-id="3231"/></td>
          <td>重装芯片</td>
          <td>154</td>
        </tr>
        <tr>
          <td><ItemImage item-id="3243"/></td>
          <td>狙击双芯片</td>
          <td>127</td>
          <td><ItemImage item-id="3242"/></td>
          <td>狙击芯片组</td>
          <td>50</td>
          <td><ItemImage item-id="3241"/></td>
          <td>狙击芯片</td>
          <td>194</td>
        </tr>
        <tr>
          <td><ItemImage item-id="3253"/></td>
          <td>术师双芯片</td>
          <td>140</td>
          <td><ItemImage item-id="3252"/></td>
          <td>术师芯片组</td>
          <td>30</td>
          <td><ItemImage item-id="3251"/></td>
          <td>术师芯片</td>
          <td>198</td>
        </tr>
        <tr>
          <td><ItemImage item-id="3263"/></td>
          <td>医疗双芯片</td>
          <td>79</td>
          <td><ItemImage item-id="3262"/></td>
          <td>医疗芯片组</td>
          <td>30</td>
          <td><ItemImage item-id="3261"/></td>
          <td>医疗芯片</td>
          <td>121</td>
        </tr>
        <tr>
          <td><ItemImage item-id="3273"/></td>
          <td>辅助双芯片</td>
          <td>103</td>
          <td><ItemImage item-id="3272"/></td>
          <td>辅助芯片组</td>
          <td>20</td>
          <td><ItemImage item-id="3271"/></td>
          <td>辅助芯片</td>
          <td>146</td>
        </tr>
        <tr>
        <td><ItemImage item-id="3283"/></td>
          <td>特种双芯片</td>
          <td>124</td>
          <td><ItemImage item-id="3282"/></td>
          <td>特种芯片组</td>
          <td>35</td>
          <td><ItemImage item-id="3281"/></td>
          <td>特种芯片</td>
          <td>181</td>
        </tr>
      </tbody>
      </v-table>
    </v-card>
    <p>其中，近卫芯片的需求量远大于特种芯片。若博士甲的养成目标为全干员满练（或者养成需求与全干员满练的需求近似成正比），则博士甲很可能需要消耗特种芯片来加工近卫芯片。</p>
    <p>由于 3 特种芯片仅能加工 2 近卫芯片，故可以直观地知道近卫芯片是比较“贵”的，特种芯片是比较“贱”的。</p>
    <v-alert border variant="tonal" type="info">
      使用九色鹿加工芯片类材料必定产出副产品，但是需要消耗因果。
    </v-alert>
    <p>对于博士甲以及类似的博士来说，我们可以将芯片划分为“强势芯片”、“弱势芯片”和“均势芯片”3 类。在同一个掉落芯片的作战中，需求量相对较大的为“强势芯片”，需求量相对较小的为“弱势芯片”，若需求量没有明显区别，则称为“均势芯片”。</p>
    <ul>
      <li>设 η 为加工芯片类材料时的副产品产出概率（使用风笛加工芯片类材料时，η = 18%），</li>
    </ul>
    <p>有以下获取芯片的路径：</p>
    <ol>
      <li>18 理智 → (1 / 2) 强势芯片 + (1 / 2) 弱势芯片 + (18 × 12) 龙门币，</li>
      <li>18 理智 → (1 / 2) 均势芯片 + (1 / 2) 均势芯片 + (18 × 12) 龙门币，</li>
      <li>3 弱势芯片 → 2 强势芯片 + (η ÷ 8) × (先锋芯片 + 近卫芯片 + 重装芯片 + 狙击芯片 + 术师芯片 + 医疗芯片 + 辅助芯片 + 特种芯片)。</li>
    </ol>
    <p>把以上路径中的“→”改成“=”，解得：</p>
    <ul>
      <li>均势芯片价值 = 18 × (1 - 12 × 龙门币价值)，</li>
      <li>强势芯片价值 = (6 - η) ÷ 5 × 18 × (1 - 12 × 龙门币价值)，</li>
      <li>弱势芯片价值 = (4 + η) ÷ 5 × 18 × (1 - 12 × 龙门币价值)。</li>
    </ul>
    <p>芯片组的价值可以类似考虑，不再赘述。</p>
    <h3 id="碳系材料">碳系材料</h3>
    <v-divider></v-divider>

    <p><b>碳系材料的价值按照“给九色鹿垫刀”来确定，获取的因果用于加工<span class="purple">紫</span>材料。</b></p>
    <p>具体来说，设</p>
    <ul>
      <li>θ 为加工精英材料时的副产品产出概率（使用年、芳汀、白铁加工精英材料时，θ = 20%），</li>
      <li>BM 为<span class="blue">蓝</span>材料价值关于加工站副产品权重的加权平均（也就是 1 个随机<span class="blue">蓝</span>材料的价值），</li>
    </ul>
    <p>有以下加工路径：</p>
    <ol>
      <li>3 碳 → 1 碳素 + 90% × 2 因果 + 10% × 1 碳素，</li>
      <li>3 碳素 → 1 碳素组 + 90% × 4 因果 + 10% × 1 碳素组，</li>
      <li>1 碳 + 200 龙门币 → 4 家具零件 + 95% × 1 因果 + 5% × 1 碳，</li>
      <li>1 碳素 + 200 龙门币 → 8 家具零件 + 95% × 1 因果 + 5% × 1 碳素，</li>
      <li>1 碳素组 + 200 龙门币 → 12 家具零件 + 95% × 4 因果 + 5% × 1 碳素组，</li>
      <li>90% × 36 因果 + 1 <span class="blue">蓝</span>材料加工<span class="purple">紫</span>材料的机会 → 1 随机<span class="blue">蓝</span>材料，</li>
      <li>1 <span class="blue">蓝</span>材料加工<span class="purple">紫</span>材料的机会 → θ 随机<span class="blue">蓝</span>材料。</li>
    </ol>
    <p>其中，路径 3、4 不划算，路径 1、2、5、6、7 是基本上划算的。</p>
    <p>把路径 1、2、5、6、7 中的“→”改成“=”，5 个方程解 5 个未知数，解得：</p>
    <ul>
      <li>因果价值 = (10 / 9) × (1 - θ) × BM ÷ 36，</li>
      <li>碳素组价值 = (240 / 19) × 家具零件价值 + 4 × 因果价值 - (4000 / 19) × 龙门币价值，</li>
      <li>碳素价值 = (11 / 30) × 碳素组价值 + (6 / 5) × 因果价值，</li>
      <li>碳价值 = (11 / 30) × 碳素价值 + (3 / 5) × 因果价值。</li>
    </ul>

    <h3 id="技巧概要">技巧概要</h3>
    <v-divider></v-divider>

    <ul>
      <li>设 ζ 为加工技巧概要时的副产品产出概率（使用赫拉格加工技巧概要时，ζ = 18%），</li>
    </ul>
    <p>有以下获取技巧概要的路径：</p>
    <ol>
      <li>30 理智 → CA-5 掉落的<span class="gray">技巧概要·卷1</span> + CA-5 掉落的<span class="green">技巧概要·卷2</span> + CA-5 掉落的<span class="blue">技巧概要·卷3</span> + (30 × 12) 龙门币 = (3 / 2) <span class="gray">技巧概要·卷1</span> + (3 / 2) <span class="green">技巧概要·卷2</span> + 2 <span class="blue">技巧概要·卷3</span> + (30 × 12) 龙门币，</li>
      <li>3 <span class="gray">技巧概要·卷1</span> → 1 <span class="green">技巧概要·卷2</span> + ζ <span class="green">技巧概要·卷2</span>，</li>
      <li>3 <span class="green">技巧概要·卷2</span> → 1 <span class="blue">技巧概要·卷3</span> + ζ <span class="blue">技巧概要·卷3</span>。</li>
    </ol>
    <p>把以上路径中的“→”改成“=”，可以解出技巧概要的价值。</p>

    <h3 id="招聘许可">招聘许可</h3>
    <v-divider></v-divider>

    <p><b>招聘许可的价值等于公开招募期望获得的<span class="green">资质凭证</span>与<span class="yellow">高级凭证</span>的总价值。</b></p>
    <ul>
      <li>
        公开招募结果的星级分布参考 <a href="https://space.bilibili.com/2268014" target="_blank" rel="noopener noreferrer">教捐</a> 的统计结果，见下图。（可能过时，仅供参考。）
        <img src="/docs/public/image/docs/教捐统计的公开招募概率.jpg" alt="教捐统计的公开招募概率"/>
      </li>
      <li><span class="green">资质凭证</span>价值取为 0.8。</li>
      <li>
        <p>假设 3★、4★ 干员潜能均已满，5★、6★ 干员均已获得但潜能未满，即认为</p>
        <ul>
          <li>获得 3★ 干员时，转化为 10 <span class="green">资质凭证</span>，</li>
          <li>获得 4★ 干员时，转化为 30 <span class="green">资质凭证</span> + 1 <span class="yellow">高级凭证</span>，</li>
          <li>获得 5★ 干员时，转化为 5 <span class="yellow">高级凭证</span>，</li>
          <li>获得 6★ 干员时，转化为 10 <span class="yellow">高级凭证</span>。</li>
        </ul>
      </li>
    </ul>

    <h2 id="参考资料">参考资料</h2>
    <v-divider></v-divider>
    <ol>
      <li>ArkPlanner，<a href="https://github.com/penguin-statistics/ArkPlanner" target="_blank" rel="noopener noreferrer">https://github.com/penguin-statistics/ArkPlanner</a></li>
      <li>企鹅物流数据统计，<a href="https://penguin-stats.io/" target="_blank" rel="noopener noreferrer">https://penguin-stats.io/</a></li>
      <li>PRTS Wiki，<a href="https://prts.wiki/" target="_blank" rel="noopener noreferrer">https://prts.wiki/</a></li>
      <li>BioHazard，SideStory 作战历史掉率，<a href="https://www.bilibili.com/read/cv39716633/" target="_blank" rel="noopener noreferrer">https://www.bilibili.com/read/cv39716633/</a></li>
      <li>BioHazard，各情形下贸易站数据，<a href="https://www.bilibili.com/read/cv28230294/" target="_blank" rel="noopener noreferrer">https://www.bilibili.com/read/cv28230294/</a></li>
    </ol>
  </div>
</template>
