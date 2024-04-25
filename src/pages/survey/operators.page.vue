<template>
  <div class="survey-operator-page">
    <c-popup :visible="introPopupVisible" v-model:visible="introPopupVisible">
      <!-- <div class="intro_title">填写流程说明</div> -->

      <div class="survey-guide-content-container">
        <h1>填写流程</h1>
        <h2>注册账号</h2>
        <p> 新用户注册可用账号密码注册和邮箱注册，也可在个人中心进行设置密码和邮箱绑定等操作</p>
        <p class="tip">
          *此账号为一图流账号，与鹰角网络通行证(明日方舟游戏账号)无关，仅为保存您的干员练度数据使用
        </p>
        <h2>数据填写</h2>
        <h3>由森空岛导入</h3>

        <label class="warn">森空岛CRED的风险声明：森空岛CRED与鹰角网络通行证的Token并不通用，
          目前仅可获取森空岛内展示的游戏数据，（仅通过官网实验不通用，不能完全确定，一图流不会保存任何CRED信息</label>

        <p><b>step1：</b>使用PC打开森空岛官网<span @click="toSKLand()" class="info">https://www.skland.com/</span>进行登录
        </p>
        <p><b>step2：</b>登录后按键盘F12调出开发者工具，在下方选择控制台(console)，输入以下命令：</p>
        <p class="info">
          localStorage.getItem('SK_OAUTH_CRED_KEY')+','+localStorage .getItem('SK_TOKEN_CACHE_KEY')
        </p>

        <p>
          <button class="btn btn-blue"
                  @click="copyCode('localStorage.getItem(\'SK_OAUTH_CRED_KEY\')+\',\'+localStorage.getItem(\'SK_TOKEN_CACHE_KEY\')')">
            复制命令
          </button>
        </p>

        <img src="/image/skland/step1.jpg" alt=""/>
        <p><b>step3：</b>输入之后回车确认</p>
        <img src="/image/skland/step2.jpg" alt=""/>
        <p><b>step4：</b>此时你可以获得一段神秘的字符，复制这段字符，<b>不要带引号</b></p>
        <img src="/image/skland/step3.jpg" alt=""/>
        <p><b>step5：</b>将 <b>step4</b> 中获得的这段字符粘贴到输入栏中，点击“导入森空岛数据”即可完成导入</p>


        <h3>手动填写</h3>
        <p>点击干员卡片，打开弹窗，可进行干员技能模组等级的设置，设置完成后点击
          顶部<span class="info">“手动保存练度”</span>按钮，
          手动填写建议修改完几个干员就进行保存，防止因网页刷新等原因丢失填写进度</p>
        <p>因森空岛的干员数据不完整，无法区分1级模组和未开启模组（在森空岛的干员数据中，以上两种情况均标注为1级），
          请用手动填写功能进行修改，手动填写的模组等级在再次导入时，以手动填写的模组等级优先，数据不会被覆盖</p>
      </div>


    </c-popup>

    <!-- 常驻条 -->
    <div class="control-header">
      <c-button color="blue" :status="true" @click="checkFirstPopup()">操作指引</c-button>

      <c-button color="blue" :status="btnStatus.btn_filter"
                @click="clickBtn('btn_filter');collapseFilter()">
        筛选/批量操作
      </c-button>

      <c-button color="blue" :status="btnStatus.btn_import"
                @click="clickBtn('btn_import');collapseImport()">
        数据导入导出
      </c-button>

      <!--      <div style="width: 60px"></div>-->
      <c-button :color="'green'" :status="true" @click="upload()">手动保存练度</c-button>
      <c-button color="blue" :status="statisticalPopupVisible"
                @click="clickBtn('btn_statistics');getOperatorStatisticalResult()">统计干员练度
      </c-button>
      <c-button color="blue" :status="recommendPopupVisible"
                @click="clickBtn('btn_recommend');getOperatorRecommend()">干员练度推荐（测试）
      </c-button>
      <!--      <c-button color="blue" :status="btn_status.btn_plan"-->
      <!--                @click="clickBtn('btn_plan');getOperatorPlanItemCost()">练度计划材料消耗统计-->
      <!--      </c-button>-->


    </div>

    <!-- 筛选模块 -->
    <c-collapse-item-v2 v-model:visible="collapseImportFilter" :name="'filter'">
      <div class="control-box">
        <div class="control-line">
          <span class="control-line-label" style="width: 80px;">职业</span>
          <div class="control-checkbox">
            <div :class="selectedBtn('profession', profession.value)"
                v-for="(profession,index) in professionDict"
                :key="index"
                @click="addFilterCondition('profession', profession.value)">
              {{ profession.label }}
            </div>
          </div>
        </div>

        <div class="control-line">
          <span class="control-line-label" style="width: 80px;">稀有度</span>
          <div class="control-checkbox">
            <div :class="selectedBtn('rarity', rarity)" v-for="(rarity,index) in RARITY_TABLE" :key="index"
                 @click="addFilterCondition('rarity', rarity)">{{ rarity }}★
            </div>
          </div>
        </div>

        <div class="control-line">
          <span class="control-line-label" style="width: 80px;">年份</span>
          <div class="control-checkbox">
            <div :class="selectedBtn('year', key)" v-for="(year, key) in yearDict" :key="key"
                 @click="addFilterCondition('year', key)">
              {{ year.label }}
            </div>
          </div>
        </div>

        <div class="control-line">
          <span class="control-line-label" style="width: 80px;">是否拥有</span>
          <div class="control-checkbox">
            <div :class="selectedBtn('own', true)" @click="addFilterCondition('own', true)">已拥有</div>
            <div :class="selectedBtn('own', false)" @click="addFilterCondition('own', false)">未拥有</div>
          </div>
        </div>

        <div class="control-line">
          <span class="control-line-label" style="width: 80px;">获得方式</span>
          <div class="control-checkbox">
            <div :class="selectedBtn('itemObtainApproach', '常驻干员')"
                 @click="addFilterCondition('itemObtainApproach', '常驻干员')">常驻干员
            </div>
            <div :class="selectedBtn('itemObtainApproach', '赠送干员')"
                 @click="addFilterCondition('itemObtainApproach', '赠送干员')">赠送干员
            </div>
            <div :class="selectedBtn('itemObtainApproach', '限定干员')"
                 @click="addFilterCondition('itemObtainApproach', '限定干员')">限定干员
            </div>
          </div>
        </div>

        <div class="control-line">
          <span class="control-line-label" style="width: 80px;">模组</span>
          <div class="control-checkbox">
            <div :class="selectedBtn('equip', true)" @click="addFilterCondition('equip', true)">模组已实装</div>
            <div :class="selectedBtn('equip', false)" @click="addFilterCondition('equip', false)">模组未实装</div>
          </div>
        </div>

        <div class="control-line">
          <span class="control-line-label" style="width: 80px;">排序</span>
          <div class="control-checkbox">
            <div class="btn" @click="sortOperatorList('rarity')">按稀有度</div>
            <div class="btn" @click="sortOperatorList('date')">按实装顺序</div>
            <div class="btn" @click="sortOperatorListByLevel('level')">按干员等级</div>
          </div>
        </div>

        <!--          <div class="control_tip ">-->
        <!--            <a class="">对所有被筛选出的干员进行操作</a>-->
        <!--          </div>-->
        <!--          <div class="control_bar">-->
        <!--            <div class="control_title" style="width: 100px;">-->
        <!--              批量操作-->
        <!--            </div>-->
        <!--            <div class="switch_btn_wrap">-->
        <!--              <div class="btn" @click="batchUpdatesOwn(true)">设为已拥有</div>-->
        <!--              <div class="btn" @click="batchUpdatesOwn(false)">设为未拥有</div>-->
        <!--              <div class="btn" @click="batchUpdatesElite(0)">设为无精</div>-->
        <!--              <div class="btn" @click="batchUpdatesElite(1)">设为精一</div>-->
        <!--              <div class="btn" @click="batchUpdatesElite(2)">设为精二</div>-->
        <!--              <div class="btn">设为满级</div>-->
        <!--              <div class="btn">设为满潜能</div>-->
        <!--              <div class="btn" @click="batchUpdatesSkillAndMod('skill1', 3)">一技能设为专三</div>-->
        <!--              <div class="btn" @click="batchUpdatesSkillAndMod('skill2', 3)">二技能设为专三</div>-->
        <!--              <div class="btn" @click="batchUpdatesSkillAndMod('skill3', 3)">三技能设为专三</div>-->
        <!--              <div class="btn" @click="batchUpdatesSkillAndMod('modX', 3)">X模组设为三级</div>-->
        <!--              <div class="btn" @click="batchUpdatesSkillAndMod('modY', 3)">Y模组设为三级</div>-->
        <!--            </div>-->
        <!--          </div>-->
      </div>
    </c-collapse-item-v2>


    <c-popup v-model="importPopupVisible">

      <div class="intro_wrap">
        <div class="intro_title">森空岛CRED的风险声明</div>
        森空岛CRED与鹰角网络通行证的Token并不通用（仅通过官网实验不通用，不能完全确定），目前仅可获取森空岛内展示的游戏数据<br/>
        一图流不会保存任何CRED信息<br/>
        <a style="color: #fa5e5e">*请妥善保管此CRED</a>
      </div>
      <div class="intro_wrap">
        <div class="intro_title">森空岛数据导入流程</div>

        <p><b>step1：</b>使用PC打开森空岛官网<a @click="toSKLand()" class="web_url">https://www.skland.com/</a>进行登录
        </p>
        <p><b>step2：</b>登录后按键盘F12调出开发者工具，在下方选择控制台(console)，输入以下命令：</p>
        <p style="color:dodgerblue">
          localStorage.getItem('SK_OAUTH_CRED_KEY')+','+localStorage .getItem('SK_TOKEN_CACHE_KEY')
        </p>
        <div>
          <button class="btn btn-blue"
                  @click="copyCode('localStorage.getItem(\'SK_OAUTH_CRED_KEY\')+\',\'+localStorage.getItem(\'SK_TOKEN_CACHE_KEY\')')">
            复制命令
          </button>
        </div>
        <img src="/image/skland/step1.jpg" class="import_tip_image" alt=""/>
        <p>输入之后回车确认</p>
        <img src="/image/skland/step2.jpg" class="import_tip_image" alt=""/>
        <p><b>step3：</b>此时你可以获得一段神秘的字符，复制这段字符，<b>不要带引号</b></p>
        <img src="/image/skland/step3.jpg" class="import_tip_image" alt=""/>
        <p><b>step4：</b>将 <b>step3</b> 中获得的这段字符粘贴到输入栏中，点击“导入森空岛数据”即可完成导入</p>
      </div>
      <div style="width: 90%;height: 200px"></div>
    </c-popup>

    <c-popup :visible="resetPopupVisible" v-model:visible="resetPopupVisible">
      <div class="popup_action_tip">
        此操作将清空一图流账号上保存的所有干员数据，确定要执行操作吗？
      </div>
      <div class="control-checkbox">
        <div class="btn btn-red" @click="operatorDataReset()">确定</div>
        <div class="btn" @click="resetPopupVisible = !resetPopupVisible">取消</div>
      </div>
    </c-popup>

    <!-- 导入导出模块 -->
    <c-collapse-item v-model:visible="collapseImportVisible" :name="'upload'">
      <div class="control-box">
        <div class="control-line-label">导入导出</div>
        <div class="control-line">
          <div class="control-checkbox">
            <button class="btn btn-green" @click="exportExcel()">导出为Excel</button>
          </div>
        </div>

        <div class="divider"></div>
        <div class="control-line-label">森空岛导入</div>
        <div class="control-line">
          <span>输入在控制台获得的字符</span>
          <div><input class="control_input" type="text" v-model="SKlandCREDAndSECRET"/></div>
          <button class="btn btn-blue" @click="importSKLandOperatorData()">导入森空岛数据</button>
          <button class="btn btn-blue" @click="importPopupVisible = !importPopupVisible">
            森空岛数据导入流程
          </button>
          <!--            <div class="btn btn-blue" style="" @click="loginByCRED()">根据CRED找回账号</div>-->
          <button class="btn btn-red" @click="resetPopupVisible = !resetPopupVisible">清空所有数据</button>

        </div>
        <div class="control-line" v-show="importFlag">
          <div class="control-line-label" style="width: 140px;">导入账号不正确？</div>
          <div class="control-checkbox">
            <div class="control-line-tip">选择你想要导入的账号</div>
            <div v-for="(binding,index) in bindingList" :key="index"
                 class="btn btn-blue" :class="chooseUidClass(binding.uid)"
                 @click="importSKLandOperatorDataByUid(binding)">
              {{ `${binding.channelName}-${binding.nickName}-${binding.uid}`}}
            </div>
          </div>

        </div>

        <div class="control-line">
          <div class="control-line-tip">*森空岛导入：请遵循
            <b>《森空岛数据导入流程》</b>的指引，导入完如显示有误请手动保存并刷新页面，如果遇到服务器意外错误，先尝试“清空所有数据”按钮<br>
          </div>
        </div>
      </div>
    </c-collapse-item>


    <!--    干员统计弹窗-->
    <c-popup v-model="statisticalPopupVisible">
      <!--          干员统计-->
      <div class="statistical-popup-context not-own-avatar-sprite-variables">
        <div class="o-statistical-card">
          <h2>博士招募情况</h2>
          <span class="statistical-module-text"> Dr.{{ userData.userName }}，您总计招募了{{
              statisticalResult.total.own
            }}位干员，
            <span v-show="statisticalResult.total.count - statisticalResult.total.own>0"
                  class="statistical-module-text"> 未招募干员{{
                statisticalResult.total.count - statisticalResult.total.own
              }}位</span>
          </span>
          <div v-show="statisticalResult.total.count - statisticalResult.total.own>0"
               class="statistical-module-text">
            未招募的干员是：
          </div>
          <div class="not_own_operator_wrap">
            <div class="not-own-avatar-sprite"
                 v-for="(operator,index) in statisticalResult.total.notOwn" :key="index">
              <div :class="getAvatarSprite(operator.charId)"></div>
              <!--              <span class="sprite-alt" style="top:70px">{{ operator.name }}</span>-->
            </div>
          </div>

          <table class="operator-statistical-table">
            <tbody>
            <tr>
              <td>星级</td>
              <td>已招募/总数</td>
              <td>精二数量</td>
              <td>专三数量</td>
              <td>3级模组</td>
            </tr>
            <tr>
              <td>总计</td>
              <td>{{ statisticalResult.total.own }}/{{ statisticalResult.total.count }}</td>
              <td>{{ statisticalResult.total.elite.rank2 }}</td>
              <td>{{ statisticalResult.total.skill.rank3 }}</td>
              <td>{{ statisticalResult.total.mod.rank3 }}</td>
            </tr>
            <tr v-for="(detail,index) in statisticsDetail" :key="index">
              <td><img :src="`/image/survey/bg/rarity-${6-index}.png`" alt=""></td>
              <td>{{ detail.own }}/{{ detail.count }}</td>
              <td>{{ detail.elite.rank2 }}</td>
              <td>{{ detail.skill.rank3 }}</td>
              <td>{{ detail.mod.rank3 }}</td>
            </tr>
            </tbody>
          </table>
        </div>

        <div class="o-statistical-card">
          <h2>干员理智投入排行</h2>
          <div class="statistical-ap-rank-list">
            <div class="operator-card" v-for="(operator, char_index) in statisticalResult.max" :key="char_index"
            >
              <div class="operator-avatar-wrap">
                <div class="operator-avatar">
                  <div :class="getAvatar(operator.charId)"></div>
                </div>
              </div>
              <div>
                <img :src="`/image/survey/rank/elite${operator.elite}.png`" class="operator-elite-image" alt="">
                <div class="operator-level-image">
                  {{ operator.level }}
                </div>
              </div>

              <div class="operator-skill-icon-sprite-wrap" v-for="(skill,index) in operator.skill" :key="index">
                <div class="operator-skill-icon-sprite">
                  <div :class="getSkillSprite(skill.iconId)"></div>
                  <img :src="`/image/survey/skill-rank-${operator[`skill${index+1}`]}.jpg`"
                       v-show="operator[`skill${index+1}`]>0" class="operator-skill-rank" alt="">
                </div>
                <div class="skill-name">{{ skill.name }}</div>
              </div>

              <div class="operator-equip-image-wrap" v-for="(equip,index) in operator.equip" :key="index">
                <div class="operator-skill-icon-sprite">
                  <img :src="`/image/survey/mod-icon/${equip.typeIcon}.png`" alt="" class="operator-equip-image">
                  <img :src="`/image/survey/skill-rank-${operator[`mod${equip.typeName2}`]}.jpg`"
                       v-show="operator[`mod${equip.typeName2}`]>0" class="operator-skill-rank">
                </div>
                <div class="equip-name">{{ `${equip.typeName1}-${equip.typeName2}` }}</div>
              </div>

              <div class="operator-equip-image-wrap">
                <div class="item-ap-sprite">
                  <div :class="getItem('AP_GAMEPLAY')"></div>
                </div>
                <div class="item-ap-cost">{{ operator.apCost.toFixed(0) }}</div>
              </div>

            </div>
          </div>
        </div>

        <div class="o-statistical-card">
          <h2>理智消耗情况</h2>
          <p style="">总计消耗{{ apCostCount.toFixed(0) }} 理智</p>
          <!--          材料统计-->

          <button class="btn btn-blue" @click="splitMaterialByRarity(5)">不拆分</button>
          <button class="btn btn-blue" @click="splitMaterialByRarity(4)">拆分材料到紫色品质</button>
          <button class="btn btn-blue" @click="splitMaterialByRarity(3)">拆分材料到蓝色品质</button>
          <div class="control-line item_cost_wrap" v-for="(itemList,type) in itemCostList"
               :key="type">
            <div v-for="(item,index) in itemList" :key="index" class="item_cost_card">
              <div class="item-used-image">
                <div :class="getItemCostSprite(item.id)"></div>
                <span class="item-used-count">
                  {{ strShowLength(item.count) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </c-popup>


    <c-popup v-model="recommendPopupVisible">
      <div class="operator-recommend-popup-container operator-recommend-avatar-variables">
        <div class="operator-recommend-card-wrap">
          <div class="operator-recommend-card"
               v-for="(recommend,index) in operatorRecommendList" :key="index">
            <div class="operator-avatar-wrap">
              <div class="operator-avatar">
                <div :class="getAvatar(recommend.charId)"></div>
              </div>
              <span class="operator-name">{{ recommend.name }}</span>
            </div>

            <div class="operator-skill-icon-sprite-wrap"
                 v-show="recommend.info.type==='skill'">
              <div class="operator-skill-icon-sprite">
                <div :class="getSkillSprite(recommend.info.iconId)"></div>
              </div>
              <!--              <div class="skill-name">{{ recommend.info.name }}</div>-->
            </div>
            <div v-show="recommend.info.type==='equip'" class="operator-equip-image-wrap">
              <img :src="`/image/survey/mod-icon/${recommend.info.iconId}.png`" alt=""
                   class="operator-equip-image">
              <div class="equip-name">{{ recommend.info.iconId }}</div>
            </div>

            <div class="recommend-text">
              {{ `平均等级为${recommend.avg.toFixed(2)}级` }} <br>
              {{ `3级占比为${(recommend.ratio * 100).toFixed(2)}%` }}
            </div>

          </div>
        </div>
      </div>

    </c-popup>

    <!--    干员推荐-->
    <c-collapse-item-v2 v-model:visible="collapseRecommendVisible" :name="'recommend'">
      <div class="control-box">
        <div class="operator-form">
          <div class="operator-recommend-card" v-for="(recommend,index) in operatorRecommendList" :key="index">
            <div class="operator-avatar">
              <div :class="getAvatar(recommend.charId)"></div>
              <div class="operator-name">{{ recommend.name }}</div>
            </div>
            <div v-show="recommend.info.type==='skill'" class="operator-skill-icon-sprite">
              <div :class="getSkillSprite(recommend.info.iconId)"></div>
              <div class="sprite-alt">{{ recommend.info.name }}</div>
            </div>
            <div v-show="recommend.info.type==='equip'" class="operator-skill-icon-sprite">
              <img :src="`/image/survey/mod-icon/${recommend.info.iconId}.png`" alt="" class="operator-equip-image">
              <div class="sprite-alt">{{ recommend.info.iconId }}</div>
            </div>

            <div class="recommend-text">
              {{ `平均等级为${recommend.avg.toFixed(2)}级` }} <br>
              {{ `3级占比为${(recommend.ratio * 100).toFixed(2)}%` }}
            </div>

          </div>
        </div>
      </div>
    </c-collapse-item-v2>

    <!--   干员表单-->
    <div class="operator-form">
      <div class="operator-card" v-for="(operator, char_index) in operatorList" :key="char_index"
           @click="updateOperatorPopup(char_index)">
        <div class="operator-avatar-wrap">
          <div class="operator-avatar">
            <div :class="getAvatar(operator.charId)"></div>
          </div>
          <span class="operator-name">{{ operator.name }}</span>
        </div>
        <div>
          <img :src="`/image/survey/rank/elite${operator.elite}.png`" class="operator-elite-image" alt="">
          <div class="operator-level-image">
            {{ operator.level }}
          </div>
        </div>

        <div class="operator-skill-icon-sprite-wrap" v-for="(skill,index) in operator.skill" :key="index">
          <div class="operator-skill-icon-sprite">
            <div :class="getSkillSprite(skill.iconId)"></div>
            <img :src="`/image/survey/skill-rank-${operator[`skill${index+1}`]}.jpg`"
                 v-show="operator[`skill${index+1}`]>0" class="operator-skill-rank" alt="">
          </div>
          <!--          <div class="skill-name">{{ skill.name }}</div>-->
        </div>

        <div class="operator-equip-image-wrap" v-for="(equip,index) in operator.equip" :key="index">
          <div class="operator-skill-icon-sprite">
            <img :src="`/image/survey/mod-icon/${equip.typeIcon}.png`" alt="" class="operator-equip-image">
            <img :src="`/image/survey/skill-rank-${operator[`mod${equip.typeName2}`]}.jpg`"
                 v-show="operator[`mod${equip.typeName2}`]>0" class="operator-skill-rank">
          </div>
          <div class="equip-name">{{ `${equip.typeName1}-${equip.typeName2}` }}</div>
        </div>

      </div>
    </div>


    <!--    <div class="opr-loading-btn" @click="loadCompleteData()">加载所有干员</div>-->

    <c-popup v-model="operatorPopupVisible">

      <div class="updateOperatorPopup">
        <div class="operator-own-switch-wrap">
          <div class="operator-avatar" style="margin: 0 4px">
            <div :class="getAvatar(operatorPopupData.charId)"></div>
          </div>
          <span>是否持有</span>
          <el-switch v-model="operatorPopupData.own">
          </el-switch>
        </div>
        <div class="operator-rank-checkbox">
          <div class="operator-equip-image-wrap">
            <img :src="`/image/survey/rank/elite${operatorPopupData.elite}.png`" class="operator-equip-image" alt="">
          </div>
          <div class="operator-rank-checkbox-button-group">
            <div v-for="rank in RANK_TABLE.slice(0,3)" :key="rank"
                 @click="updateOperatorData(operatorPopupData.charId,`elite`,rank)"
                 class="operator-rank-checkbox-button"
                 :class="dataOptionClass(operatorPopupData.charId,rank,`elite`)">
              <img :src="`/image/survey/rank/elite${rank}.png`"
                   class="operator-rank-checkbox-button-icon" alt="">
              <!--              <div :class="getOptionEliteSprite(`elite${rank}`)"></div>-->
            </div>
          </div>
        </div>

        <div class="operator-rank-checkbox" v-for="(skill,index) in operatorPopupData.skill" :key="index">
          <div class="operator-skill-icon-sprite-wrap"
               @click="updateOperatorData(operatorPopupData.charId,`skill${index+1}`,0)">
            <div class="operator-skill-icon-sprite">
              <div :class="getSkillSprite(skill.iconId)"></div>
              <img :src="`/image/survey/skill-rank-${operatorPopupData[`skill${index+1}`]}.jpg`"
                   v-show="operatorPopupData[`skill${index+1}`]>0" class="operator-skill-rank" alt="">
            </div>
          </div>

          <div class="operator-rank-checkbox-button-group">
            <div v-for="rank in RANK_TABLE.slice(1,4)" :key="rank"
                 class="operator-rank-checkbox-button"
                 @click="updateOperatorData(operatorPopupData.charId,`skill${index+1}`,rank)"
                 :class="dataOptionClass(operatorPopupData.charId,rank,`skill${index+1}`)">
              <img :src="`/image/survey/rank/skill-rank-${rank}.png`" class="operator-rank-checkbox-button-icon"
                   alt=""/>
            </div>
          </div>
        </div>

        <div class="operator-rank-checkbox"
             v-for="(equip,index) in operatorPopupData.equip" :key="index">
          <div class="operator-equip-image-wrap"
               @click="updateOperatorData(operatorPopupData.charId,`mod${equip.typeName2}`,0)">
            <img :src="`/image/survey/mod-icon/${equip.typeIcon}.png`" alt="" class="operator-equip-image">
            <img :src="`/image/survey/skill-rank-${operatorPopupData[`mod${equip.typeName2}`]}.jpg`"
                 v-show="operatorPopupData[`mod${equip.typeName2}`]>0" class="operator-equip-rank">
            <div class="equip-name">{{ `${equip.typeName1}-${equip.typeName2}` }}</div>
          </div>

          <div class="operator-rank-checkbox-button-group">
            <button v-for="rank in RANK_TABLE.slice(1,4)" :key="rank"
                    class="operator-rank-checkbox-button"
                    @click="updateOperatorData(operatorPopupData.charId,`mod${equip.typeName2}`,rank)"
                    :class="dataOptionClass(operatorPopupData.charId,rank,`mod${equip.typeName2}`)">
              <img :src="`/image/survey/rank/mod-rank-${rank}.png`" class="operator-rank-checkbox-button-icon" alt=""/>
            </button>
          </div>

        </div>
      </div>
    </c-popup>

    <!-- 数据声明 -->
    <!-- <div class="char_card">此处安放版权声明/开发信息</div> -->
    <div class="footer_info">
      除非另有声明，网站其他内容采用
      <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/">知识共享署名-非商业性使用-相同方式共享</a>授权。
    </div>
  </div>
</template>

<script setup>
import {cMessage} from "/src/custom/message.js";
import {filterByCharacterProperty, professionDict, yearDict} from "./js/common"; //基础信息（干员基础信息列表，干员职业字典，干员星级）
import operatorStatistical from "/src/pages/survey/js/operatorStatistical"
import surveyApi from "/src/api/userInfo";
import surveyOperatorApi from "/src/api/surveyOperator"
import sklandApi from '/src/pages/survey/js/skland'
import {onMounted, ref} from "vue";
import {http} from "/src/api/baseURL";
import operatorRecommend from "/src/pages/survey/js/operatorRecommend";
import characterTable from '/src/static/json/survey/character_table_simple.json'


// import "/src/assets/css/survey/survey_character.css";
import "/src/assets/css/survey/operator.scss";
import "/src/assets/css/survey/operator.phone.scss";
import {debounce} from "/src/utils/debounce";
import {getUserInfo} from "/src/pages/survey/js/userData.js";

let RANK_TABLE = ref([0, 1, 2, 3, 4, 5, 6]);  //等级
let RARITY_TABLE = [1, 2, 3, 4, 5, 6];  //星级

let userData = ref({uid:0,userName: "未登录",akUid:"0", status: -100, token: void 0});  //用户信息

/**
 * 获取本地缓存的用户信息
 */
async function getUserInfoAndOperatorData() {

  userData.value = await getUserInfo()
  getOperatorData()
}

/**
 * 检查用户状态
 * @param notice 是否弹出提示
 * @returns {boolean} 状态
 */
function checkUserStatus(notice) {
  if (!userData.value.token) {
    if (notice) {
      cMessage('请先注册或登录一图流账号', 'error')
    }
    return true;
  }
  return false
}


/**
 * 找回一图流账号
 */
// eslint-disable-next-line no-unused-vars
async function retrieveAccount() {
  const data = {
    cred: SKlandCREDAndSECRET.value
  }

  surveyApi.retrievalUserAccountByCred(data).then(response => {
    const userName = response.data.userName;
    login(userName)
  })
}


let introPopupVisible = ref(false) //网站教程弹窗显示状态

/**
 * 检查是否是第一次进入页面
 */
function checkFirstPopup() {
  introPopupVisible.value = !introPopupVisible.value
  localStorage.setItem("first_popup", "done");
}


let operatorTable = ref(characterTable);
let operatorList = ref([])  //干员列表

/**
 * 找回填写过的角色信息
 */
function getOperatorData() {
  //检查是否登录
  if (checkUserStatus(false)) {
    console.log("未登录")

    return;
  }

  const data = {token: userData.value.token}

  //根据一图流的token查询用户填写的干员数据
  surveyApi.getSurveyOperatorData(data).then((response) => {
    let list = response.data; //后端返回的数据
    let obj = {}
    //转为前端的数据格式
    for (const item of list) {
      const sCharId = item.charId;
      obj[sCharId] = item
      if (operatorTable.value[sCharId]) {
        operatorTable.value[sCharId].elite = item.elite;
        operatorTable.value[sCharId].level = item.level;
        operatorTable.value[sCharId].potential = item.potential;
        operatorTable.value[sCharId].mainSkill = item.mainSkill;
        operatorTable.value[sCharId].skill1 = item.skill1;
        operatorTable.value[sCharId].skill2 = item.skill2;
        operatorTable.value[sCharId].skill3 = item.skill3;
        operatorTable.value[sCharId].modX = item.modX;
        operatorTable.value[sCharId].modY = item.modY;
        operatorTable.value[sCharId].modD = item.modD;
        operatorTable.value[sCharId].own = item.own;
      }
    }
    //转为前端的数据格式
    // loadDisplayData()
    cMessage("导入了 " + list.length + " 条数据");
  });
}


// let charIdSet = ref({})

// let intersectionObserver  = new IntersectionObserver(
//     function (entries){
//       const entry = entries[0]
//       if(entry.isIntersecting){
//         for(const charId in operatorTable.value){
//           const operator =  operatorTable[charId]
//           if(!charIdSet.value[charId]&&operator.show){
//            operatorList.value.push(operator)
//           }
//
//           if(operatorList.value.length>=maxOperatorDisplayQuantity) break;
//         }
//         console.log('加载更多')
//       }
//
//       maxOperatorDisplayQuantity+=10;
//     }
// )
//
// let dropdown = document.getElementById('dropdown');
//
// intersectionObserver.observe(dropdown)


function sleep(time) {
  return new Promise((resolve) => setTimeout(resolve, time))
}


/**
 * 加载完整干员列表
 */
function loadDisplayData() {
  operatorList.value = []
  for (const charId in operatorTable.value) {
    const operator = operatorTable.value[charId]
    if (operatorList.value.length >= 32) {
      break;
    }
    if (operator.show) {
      operatorList.value.push(operator)
    }
  }
}


let isCompleteData = ref(false)

/**
 * 加载完整数据
 */
const loadCompleteData = debounce(() => {
  operatorList.value = []
  for (const charId in operatorTable.value) {
    const operator = operatorTable.value[charId]
    if (operator.show) {
      operatorList.value.push(operator)
    }
  }
  console.log('执行了')
  isCompleteData.value = true;
}, 1000)


function importData() {
  operatorList.value = []
  for (const charId in operatorTable.value) {
    const operator = operatorTable.value[charId]
    if (operator.show) {
      operatorList.value.push(operator)
    }
  }
}

/**
 * 导出评分表的excel
 */
function exportExcel() {
  const exportExcelLink = http + "survey/operator/export?token=" + userData.value.token;
  const element = document.createElement("a");
  element.download = "form.xlsx";
  element.style.display = "none";
  element.href = exportExcelLink;
  element.click();
}


let importPopupVisible = ref(false)  //导入教程弹窗显示状态
let SKlandCREDAndSECRET = ref("");  //森空岛cred
let bindAccount = ref(false) //玩家uid是否绑定了一图流账号
let bindingList = ref([])  //绑定列表
let currentUid = ref('')  //默认uid
let importFlag = ref(false) //是否导入
let collapseImportVisible = ref(true) //导入折叠栏显示状态

//控制导入折叠栏关闭展开
function collapseImport() {
  collapseImportVisible.value = !collapseImportVisible.value
}


/**
 * 通过cred和secret进行森空岛干员信息导入
 * @returns {Promise<void>}
 */
async function importSKLandOperatorData() {

  if (checkUserStatus(true)) {
    return;
  }


  //获取凭证和密匙
  const {cred, secret} = getCredAndSecret(SKlandCREDAndSECRET.value)
  //方舟uid
  let akUid = "0"
  let akNickName = ""

  //获取绑定信息
  const playerBinding = await sklandApi.getPlayBinding(userData.value.akUid,'', secret, cred);

  if(!playerBinding){
    return
  }

  //森空岛账号下绑定的所有方舟uid
  bindingList.value = playerBinding.bindingList
  importFlag.value = true

  //当前导入的方舟uid
  currentUid.value = playerBinding.uid

  await importSKLandOperatorDataByUid(playerBinding)
}

/**
 * 如果导入错误可以自己选择uid进行导入
 * @param akPlayerBinding 玩家账号绑定信息
 * @returns {Promise<void>}
 */
async function importSKLandOperatorDataByUid(akPlayerBinding) {
  const {uid,nickName,channelName,channelMasterId} = akPlayerBinding

  if (checkUserStatus(true)) {
    return;
  }

  const {cred, secret} = getCredAndSecret(SKlandCREDAndSECRET.value)

  const params = {
    requestUrl:'/api/v1/game/player/info',
    requestParam:`uid=${uid}`,
    secret:secret,
    cred:cred,
    akUid:uid,
    akNickName:nickName,
    channelMasterId:channelMasterId,
    channelName:channelName,
  }

  const playerInfo = await sklandApi.getPlayerInfo(params)


  if(!playerInfo){
    return
  }

  await uploadSKLandData({
    token: userData.value.token,
    data: JSON.stringify(playerInfo)
  })


}


async function getSklandOperatorData(akUid,akNickName){
  if (checkUserStatus(true)) {
    return;
  }

  const {cred, secret} = getCredAndSecret(SKlandCREDAndSECRET.value)

  const params = {
    requestUrl:'/api/v1/game/player/info',
    requestParam:`uid=${akUid}`,
    secret:secret,
    cred:cred,
    akUid:akUid,
    akNickName:akNickName
  }

  const playerInfo = await sklandApi.getPlayerInfo(params)

  await uploadSKLandData({
    token: userData.value.token,
    data: JSON.stringify(playerInfo)
  })

}

/**
 * 获取cred和secret
 * @param text 用户输入的字符串
 * @return {{cred: *, secret: *}}  cred和secret
 */
function getCredAndSecret(text) {

  if (!text.includes(',')) {
    cMessage('输入格式不正确,应是一个中间包含逗号的一串字母', 'error')
  }
  text = text.replace(/\s+/g, '')
      .replace(/["']/g, '')

  const textArr = text.split(',')
  const cred = textArr[0]
  const secret = textArr[1]
  return {cred, secret}

}

/**
 * 上传获取到的森空岛干员数据
 * @param token 用户凭证
 * @param data 干员数据
 * @returns {Promise<void>}
 */
async function uploadSKLandData({token, data}) {

  surveyOperatorApi.uoloadSkLandOperatorData({token, data})
      .then(response => {
        uploadMessage.value = response.data;
        cMessage("森空岛数据导入成功");
        bindAccount.value = false;
        getUserInfoAndOperatorData()
      })
}

//选择导入uid的按钮样式
function chooseUidClass(uid) {
  if (uid === currentUid.value) return 'btn-blue'
}

let resetPopupVisible = ref(false) //重置账号提示弹窗显示状态

/**
 * 重置账号数据
 */
function operatorDataReset() {

  let data = {
    token: userData.value.token,
  }
  surveyOperatorApi.resetOperatorData(data).then(response => {
    cMessage(response.data)
  })
}

/**
 * 登录一图流账号
 * @param userName 一图流用户名（即账号名）
 */
function login(userName) {
  let data = {userName: userName}
  surveyApi.login(data).then(response => {
    if (response.data.status > 0) {
      localStorage.setItem("globalUserData", JSON.stringify(response.data));
      // 登录成功刷新
      location.reload()
    }
  })
}

//上传APi返回的信息
let uploadMessage = ref({updateTime: "", affectedRows: 0, registered: false, userName: ''});
//每次点击操作记录下被更新的干员的索引，只上传被修改过的干员
let selectedCharId = ref({});


/**
 * 手动上传
 */
const upload = debounce(() => {
  let uploadList = createUploadData();
  surveyApi.uploadCharacter(uploadList, userData.value.token).then((response) => {
    uploadMessage.value = response.data;
    cMessage("保存成功");
    selectedCharId.value = {};
  });
}, 5000)

let uploadFileName = ref("上传的文件名");

/**
 * 将需要上传的数据去除无用信息
 */
function createUploadData() {
  let uploadList = [];
  for (const sCharId in selectedCharId.value) {
    const operator = {
      charId: operatorTable.value[sCharId].charId,
      own: operatorTable.value[sCharId].own,
      rarity: operatorTable.value[sCharId].rarity,
      elite: operatorTable.value[sCharId].elite,
      level: operatorTable.value[sCharId].level,
      potential: operatorTable.value[sCharId].potential,
      skill1: operatorTable.value[sCharId].skill1,
      skill2: operatorTable.value[sCharId].skill2,
      skill3: operatorTable.value[sCharId].skill3,
      modX: operatorTable.value[sCharId].modX,
      modY: operatorTable.value[sCharId].modY,
    };
    uploadList.push(operator);
  }

  return uploadList;
}


// eslint-disable-next-line no-unused-vars
let maaData = ref([{}]);

// eslint-disable-next-line
function maaData1() {
  // let dataJson = JSON.parse(maaData.value);

}

let operatorPopupVisible = ref(false) //干员弹窗的显示状态
let operatorPopupData = ref({})   //干员弹窗内的干员数据

/**
 * 更新修改干员练度弹窗内的干员数据
 * @param {number} index 列表索引
 */
function updateOperatorPopup(index) {
  operatorPopupVisible.value = true;
  operatorPopupData.value = operatorList.value[index]
}

/**
 * 修改干员练度
 * @param {string} charId 干员id
 * @param {string} property 属性
 * @param {number} newValue 新值
 */
function updateOperatorData(charId, property, newValue) {
  operatorPopupData.value[property] = newValue
  operatorTable.value[charId][property] = newValue
  selectedCharId.value[charId] = charId
}

/**
 * 返回干员的属性选项是否选中样式
 * @param {string} charId 干员id
 * @param {string} current 干员属性值
 * @param {string} property 干员属性名
 * @returns {string} class css样式
 */
function dataOptionClass(charId, current, property) {
  if (current === operatorPopupData.value[property]) {
    return 'is-selected'
  }

}


/**
 * 返回筛选按钮是否选中的样式
 * @param {string} property 干员属性名
 * @param {string} rule 筛选规则
 * @returns {string} class 按钮样式
 */
function selectedBtn(property, rule) {
  if (filterCondition.value[property].indexOf(rule) > -1) {
    return "btn btn-blue";
  }
  return "btn";
}

let collapseImportFilter = ref(false)  //干员筛选条件折叠栏的展开状态

let filterCondition = ref({   //干员筛选条件
  rarity: [6],
  profession: [],
  year: [],
  own: [true],
  equip: [],
  itemObtainApproach: [],
  TODO: []
});

/**
 * 控制干员筛选条件折叠栏展开状态
 */
function collapseFilter() {
  collapseImportFilter.value = !collapseImportFilter.value
}

/**
 *  增加筛选规则
 * @param {string} property  干员属性
 * @param {string} condition 筛选条件
 */
function addFilterCondition(property, condition) {
  console.log(filterCondition.value[property]);
  if (filterCondition.value[property].indexOf(condition) > -1) {
    filterCondition.value[property] = filterCondition.value[property].filter(e => e !== condition)
    filterCharacterList();
    return;
  }

  filterCondition.value[property].push(condition);
  filterCharacterList();
}


/**
 * 过滤干员列表
 */
function filterCharacterList() {
  operatorList.value = []
  for (let charId in operatorTable.value) {
    const operator = operatorTable.value[charId];
    const show = filterByCharacterProperty(filterCondition.value, operator);
    operatorTable.value[charId].show = show;

    if (show) {
      operatorList.value.push(operator)
    }
  }
}


let sortProperty = ref({})

/**
 * 干员数组operator_list根据干员属性排序
 * @param {string} property 干员属性
 */
function sortOperatorList(property) {

  sortProperty.value[property] = !sortProperty.value[property]
  operatorList.value.sort((a, b) => {
    if (sortProperty.value[property]) {
      return a[property] - b[property];
    } else {
      return b[property] - a[property];
    }
  });
}

function sortOperatorListByLevel(property) {
  sortProperty.value[property] = !sortProperty.value[property]
  operatorList.value.sort((a, b) => {
    let difference = 0;
    if (a.elite !== b.elite) {
      difference = b.elite - a.elite
    } else {
      difference = b.level - a.level
    }
    return sortProperty.value[property] ? difference : -difference;
  });
}

let itemCostList = ref([]) //材料消耗数量
let apCostCount = ref(0) //理智消耗数量
let itemCostTable = ref({}) //材料消耗数量

let statisticalPopupVisible = ref(false)

function getOperatorStatisticalResult() {
  statistics()
  setTimeout(function () {
    statisticalPopupVisible.value = !statisticalPopupVisible.value
  }, 20)
}


//干员练度统计结果
let statisticalResult = ref({
  max: [],
  total: {notOwn: [],elite:0, count: 0, own: 0, skill: {}, mod: {}, modX: {}, modY: {}, modD: {}},
  rarity6: {notOwn: [],elite:0, count: 0, own: 0, skill: {}, mod: {}, modX: {}, modY: {}, modD: {}},
  rarity5: {notOwn: [],elite:0, count: 0, own: 0, skill: {}, mod: {}, modX: {}, modY: {}, modD: {}},
  rarity4: {notOwn: [],elite:0, count: 0, own: 0, skill: {}, mod: {}, modX: {}, modY: {}, modD: {}},
  rarity3: {notOwn: [],elite:0, count: 0, own: 0, skill: {}, mod: {}, modX: {}, modY: {}, modD: {}},
  rarity2: {notOwn: [],elite:0, count: 0, own: 0, skill: {}, mod: {}, modX: {}, modY: {}, modD: {}},
  rarity1: {notOwn: [],elite:0, count: 0, own: 0, skill: {}, mod: {}, modX: {}, modY: {}, modD: {}},
})

let statisticsDetail = ref([statisticalResult.value.rarity6, statisticalResult.value.rarity5,
  statisticalResult.value.rarity4, statisticalResult.value.rarity3,
  statisticalResult.value.rarity2, statisticalResult.value.rarity1])

//各种统计
function statistics() {
  const result = operatorStatistical.calAPCost(operatorTable.value);
  itemCostTable.value = result.itemMap;
  itemCostList.value = result.itemList;
  apCostCount.value = result.apCostCount;

  statisticalResult.value = operatorStatistical.operatorStatistical(operatorTable.value)

  statisticsDetail.value = [
    statisticalResult.value.rarity6, statisticalResult.value.rarity5,
    statisticalResult.value.rarity4, statisticalResult.value.rarity3,
    statisticalResult.value.rarity2, statisticalResult.value.rarity1
  ]
}


/**
 * 根据材料最大星级对材料进行拆解计算
 * @param highestRarity  材料最大星级
 */
function splitMaterialByRarity(highestRarity) {
  itemCostList.value = operatorStatistical.splitMaterial(highestRarity, itemCostTable.value);
}


let collapseRecommendVisible = ref(false)  //干员练度推荐折叠栏的显示状态
let operatorRecommendList = ref([]) //干员练度推荐列表
let recommendPopupVisible = ref(false);


/**
 * 控制干员练度推荐折叠栏的显示状态
 */
async function getOperatorRecommend() {
  operatorRecommendList.value = await operatorRecommend.operatorRecommend(operatorTable.value)

  setTimeout(function () {
    recommendPopupVisible.value = !recommendPopupVisible.value;
  }, 50);

}


/**
 * 数字展示长度限制
 * @param num  原始数字
 * @returns {string|*}  格式化后的数字
 */
function strShowLength(num) {
  if (num > 99999999) {
    return (num / 100000000).toFixed(2) + "亿"
  }
  if (num > 9999) {
    return (num / 10000).toFixed(1) + "万"
  }
  return num
}


function toSKLand() {
  window.open("https://www.skland.com");
}

/**
 * 点击复制内容
 */
function copyCode(text) {
  let elementInput = document.createElement('input');
  elementInput.value = text
  document.body.appendChild(elementInput)
  elementInput.select()
  document.execCommand("Copy");
  elementInput.remove()
}

let btnStatus = ref({
  btn_import: true,
  btn_filter: false,
  btn_statistics: false,
  btn_plan: false,
  btn_recommend: false
})  //所有按钮的状态

/**
 * 点击按钮改变按钮状态
 * @param btnId 按钮id
 */
function clickBtn(btnId) {
  btnStatus.value[btnId] = !btnStatus.value[btnId]
}


function getAvatarSprite(id) {

  return "bg-" + id;

}

/**
 * 获取雪碧图
 * @param {string} id 图片id
 * @returns {string} css样式名
 */
function getItemCostSprite(id) {
  return 'bg-' + id
}

function getAvatar(id) {
  return "bg-" + id;
}

function getSkillSprite(id) {
  return "bg-skill_icon_" + id;
}

function getItem(id) {
  return 'bg-' + id
}


onMounted(() => {
  importData()
  getUserInfoAndOperatorData()


});
</script>


<style scoped>
.btn {
  margin: 2px;
}

.dev_table {
  border-collapse: collapse;
  text-align: center;
  margin: 12px auto;
}

.dev_table td {
  border: 1px solid black;
  padding: 8px
}


.web_url {
  padding: 0 8px 0 8px;
  color: dodgerblue;
  cursor: pointer;
}


.control_input {
  margin: 2px 12px;
  height: 20px;
  line-height: 20px;
  width: 230px;
  border: none;
  outline: none;
  color: var(--c-input-text-color);
  border-bottom: var(--c-input-border);
  background-color: var(--c-input-bg);
}

.control_input:hover {
  border-bottom: solid rgb(105, 157, 239) 2px;
}

.import_tip_image {
  width: 400px;
  display: inline-block;
  margin: auto;
  box-shadow: 2px 2px 8px rgba(0, 0, 0, 0.3);
}


.not_own_operator_wrap {
  display: flex;
  flex-wrap: wrap;
  margin: auto;
  width: fit-content;
}


.control_operator_card {
  width: 500px;
  display: block;
  text-align: center;
  font-size: 20px;
  font-weight: 600;
}


</style>