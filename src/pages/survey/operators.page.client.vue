<template>
  <div class="survey_character_page">
    <c-popup :visible="introPopupVisible" v-model:visible="introPopupVisible">
      <!-- <div class="intro_title">填写流程说明</div> -->
      <div class="intro_wrap">
        <div class="intro_title">填写方法</div>
        <b>填写前请在右上角注册并登录一个账号，以方便在不同设备间同步</b><br>
        默认干员未拥有,卡片显示为灰色(除头像外),点击头像设置为拥有此干员
        <br/>点击选择精英化、专精、模组等级，再次点击则可以取消
      </div>

      <div class="intro_wrap">
        <div class="intro_title">保存机制</div>
        填写的时候可以多点点保存，如不慎误操作，可以刷新页面从服务器上重新拉取数据
      </div>

      <div class="intro_wrap">
        <div class="intro_title">三种填写模式</div>
        极简模式：是否持有<br/>
        标准模式：是否持有、精英化程度、专精、模组<br/>
        完整模式：是否持有、精英化程度、专精、模组、潜能<br/>
        建议填的详细一些，以后会基于这些数据推出新功能
      </div>

      <div class="intro_wrap">
        <div class="intro_title">批量操作</div>
        批量操作：先筛选，再应用于全部筛选出的干员<br/>
        除“全部设为已拥有”和“全部设为未拥有”外，都仅对已拥有的干员生效
      </div>

      <div class="intro_wrap">
        <div class="intro_title">导入和导出</div>
        数据导入/导出：目前支持Excel的导入导出和森空岛CRED导入，json导出等功能还在开发中
      </div>
    </c-popup>

    <!-- 常驻条 -->
    <div class="setup_top">
      <c-button :color="'blue'" @click="checkFirstPopup()">填写说明</c-button>

      <c-button :color="'blue'" :status="btn_status.btn_filter"
                @click="clickBtn('btn_filter');collapseFilter()">
        筛选/批量操作
      </c-button>

      <c-button :color="'blue'" :status="btn_status.btn_import"
                @click="clickBtn('btn_import');collapseImport()">
        数据导入导出
      </c-button>
      <c-button :color="'blue'" @click="feedback()">建议与反馈</c-button>
      <div style="width: 60px"></div>
      <c-button :color="'green'" :status="true" @click="upload()">手动保存练度</c-button>
      <c-button :color="'blue'" :status="btn_status.btn_statistics"
                @click="clickBtn('btn_statistics');statisticsCollapse()">统计干员练度
      </c-button>
      <c-button :color="'blue'" :status="btn_status.btn_recommend"
                @click="clickBtn('btn_recommend');getOperatorRecommend()">干员练度推荐（测试）
      </c-button>
      <!--      <c-button :color="'blue'" :status="btn_status.btn_plan"-->
      <!--                @click="clickBtn('btn_plan');getOperatorPlanItemCost()">练度计划材料消耗统计-->
      <!--      </c-button>-->


    </div>

    <!-- 筛选模块 -->
    <c-collapse-item v-model:visible="collapseImportFilter" :name="'filter'">
      <div class="control_bar_wrap">
        <div class="control_bar">
          <div class="control_title" style="width: 80px;">职业</div>
          <div class="switch_btn_wrap">
            <div
                :class="selectedBtn('profession', profession.value)"
                v-for="(profession,index) in professionDict"
                :key="index"
                @click="addFilterCondition('profession', profession.value)"
            >
              {{ profession.label }}
            </div>
          </div>
        </div>

        <div class="control_bar">
          <div class="control_title" style="width: 80px;">稀有度</div>
          <div class="switch_btn_wrap">
            <div :class="selectedBtn('rarity', rarity)" v-for="(rarity,index) in RARITY_TABLE" :key="index"
                 @click="addFilterCondition('rarity', rarity)">{{ rarity }}★
            </div>
          </div>
        </div>

        <div class="control_bar">
          <div class="control_title" style="width: 80px;">年份</div>
          <div class="switch_btn_wrap">
            <div :class="selectedBtn('year', key)" v-for="(year, key) in yearDict" :key="key"
                 @click="addFilterCondition('year', key)">
              {{ year.label }}
            </div>
          </div>
        </div>

        <div class="control_bar">
          <div class="control_title" style="width: 80px;">是否拥有</div>
          <div class="switch_btn_wrap">
            <div :class="selectedBtn('own', true)" @click="addFilterCondition('own', true)">已拥有</div>
            <div :class="selectedBtn('own', false)" @click="addFilterCondition('own', false)">未拥有</div>
          </div>
        </div>

        <div class="control_bar">
          <div class="control_title" style="width: 80px;">获得方式</div>
          <div class="switch_btn_wrap">
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

        <div class="control_bar">
          <div class="control_title" style="width: 80px;">模组</div>
          <div class="switch_btn_wrap">
            <div :class="selectedBtn('equip', true)" @click="addFilterCondition('equip', true)">模组已实装</div>
            <div :class="selectedBtn('equip', false)" @click="addFilterCondition('equip', false)">模组未实装</div>
          </div>
        </div>

        <div class="control_bar">
          <div class="control_title" style="width: 80px;">排序</div>
          <div class="switch_btn_wrap">
            <div class="btn" @click="sortOperatorList('rarity')">按稀有度</div>
            <div class="btn" @click="sortOperatorList('date')">按实装顺序</div>
          </div>
        </div>

        <div class="mdui-divider" style="margin: 8px;"></div>
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
    </c-collapse-item>


    <c-popup :visible="importPopupVisible" v-model:visible="importPopupVisible">
      <div>
        <div class="intro_wrap">
          <div class="intro_title">森空岛CRED的风险声明</div>
          森空岛CRED与鹰角网络通行证的Token并不通用（仅通过官网实验不通用，不能完全确定），目前仅可获取森空岛内展示的游戏数据<br/>
          一图流不会保存任何CRED信息<br/>
          <a style="color: #fa5e5e">*请妥善保管此CRED</a>
        </div>
        <div class="intro_wrap">
          <div class="intro_title">森空岛数据导入流程</div>

          <p><b>step1：</b>使用PC打开森空岛官网<a @click="toSkland()" class="web_url">https://www.skland.com/</a>进行登录
          </p>
          <p><b>step2：</b>登录后按键盘F12调出开发者工具，在下方选择控制台(console)，输入以下命令：</p>
          <a style="color:dodgerblue">
            localStorage.getItem('SK_OAUTH_CRED_KEY')+','+localStorage<br>.getItem('SK_TOKEN_CACHE_KEY')
          </a>

          <button class="btn btn_blue"
                  @click="copyCode('localStorage.getItem(\'SK_OAUTH_CRED_KEY\')+\',\'+localStorage.getItem(\'SK_TOKEN_CACHE_KEY\')')">
            复制命令
          </button>
          <br/>输入之后回车确认

          <img src="/image/skland/step1.jpg" class="import_tip_image" alt=""/>
          <p><b>step3：</b>此时你可以获得一段神秘的字符，复制这段字符，<b>不要带引号</b></p>
          <img src="/image/skland/step2.jpg" class="import_tip_image" alt=""/>
          <p><b>step4：</b>将 <b>step3</b> 中获得的这段字符粘贴到输入栏中，点击“导入森空岛数据”即可完成导入</p>
          <img src="/image/skland/step3.jpg" class="import_tip_image" alt=""/>
        </div>
      </div>

    </c-popup>

    <c-popup :visible="resetPopupVisible" v-model:visible="resetPopupVisible">
      <div class="popup_action_tip">
        此操作将清空一图流账号上保存的所有干员数据，确定要执行操作吗？
      </div>
      <div class="btn_switch_wrap">
        <div class="btn btn_red" @click="operatorDataReset()">确定</div>
        <div class="btn" @click="resetPopupVisible = !resetPopupVisible">取消</div>
      </div>

    </c-popup>

    <!-- 导入导出模块 -->
    <c-collapse-item v-model:visible="collapseImportVisible" :name="'upload'">
      <div class="control_bar_wrap">
        <div class="control_bar">
          <div class="control_title">导入导出</div>
          <div class="switch_btn_wrap">
            <div class="btn btn_green" @click="exportExcel()">导出为Excel</div>
          </div>
        </div>

        <div class="divider"></div>
        <div class="control_bar">
          <div class="control_title" style="width: 100px;">森空岛导入</div>
          <div class="switch_btn_wrap">
            <div class="control_desc">输入在控制台获得的字符</div>
            <div><input class="control_input" type="text" v-model="skland_CRED_and_SECRET"/></div>
            <div class="btn btn_blue" @click="importSKLandOperatorData()">导入森空岛数据</div>
            <div class="btn btn_blue" @click="importPopupVisible = !importPopupVisible">
              森空岛数据导入流程
            </div>
            <!--            <div class="btn btn_blue" style="" @click="loginByCRED()">根据CRED找回账号</div>-->
            <div class="btn btn_red" @click="resetPopupVisible = !resetPopupVisible">清空所有数据</div>
          </div>
        </div>
        <div class="control_bar" v-show="importFlag">
          <div class="control_title" style="width: 140px;">导入账号不正确？</div>
          <div class="switch_btn_wrap">
            <div class="control_desc">选择你想要导入的账号</div>
            <div v-for="(binding,index) in bindingList" :key="index"
                 class="btn btn_blue" :class="chooseUidClass(binding.uid)"
                 @click="importSKLandOperatorDataByUid(binding.uid)">
              {{ binding.uid }}
            </div>
          </div>

        </div>

        <div class="control_bar" v-show="bindAccount">
          <div class="control_tip">您已经导入过该账号的练度数据，已注册的一图流账号为：<a class="warning_color">
            {{ upload_message.userName }} </a> 请登录之前的账号 <br>
            <div class="btn btn_blue" @click="login(upload_message.userName)">
              请登录用户{{ upload_message.userName }}并刷新网页
            </div>
          </div>
        </div>
        <div class="control_bar">
          <div class="control_tip"><b>*森空岛导入：</b>请遵循
            <b>《森空岛数据导入流程》</b>的指引，导入完如显示有误请手动保存并刷新页面，如果遇到服务器意外错误，先尝试“清空所有数据”按钮<br>
          </div>
        </div>
      </div>
    </c-collapse-item>


    <!--    干员统计折叠栏-->
    <c-collapse-item v-model:visible="collapse_statistics_visible" :name="'statistics'">
      <div class="control_bar_wrap">
        <!--          干员统计-->
        <div class="control_bar" style="align-items: normal;justify-content: space-around;margin: 20px 0">
          <div class="control_operator_card">
            <p> Dr.{{ userData.userName }}，您总计招募了{{ statisticsResult.total.own }}位干员，
              未招募干员{{ statisticsResult.total.count - statisticsResult.total.own }}位，
              未招募的干员是
            </p>
            <div class="not_own_operator_wrap">
              <div class="opr_sprite_avatar_bg" style="margin: 0 4px 30px 4px"
                   v-for="(operator,index) in statisticsResult.total.notOwn" :key="index">
                <div :class="getOperatorSprite(operator.charId)"></div>
                <div class="sprite_alt" style="top:70px">{{ operator.name }}</div>
              </div>
            </div>
            <table class="dev_table">
              <tbody>
              <tr>
                <td>星级</td>
                <td>已招募/总数</td>
                <td>专三数量</td>
                <td>3级X模组</td>
                <td>3级Y模组</td>
              </tr>
              <tr>
                <td>总计</td>
                <td>{{ statisticsResult.total.own }}/{{ statisticsResult.total.count }}</td>
                <td>{{ statisticsResult.total.skill.rank3 }}</td>
                <td>{{ statisticsResult.total.modX.rank3 }}</td>
                <td>{{ statisticsResult.total.modY.rank3 }}</td>
              </tr>
              <tr v-for="(detail,index) in statistics_detail" :key="index">
                <td><img :src="`/image/survey/bg/rarity-${6-index}.png`" alt=""></td>
                <td>{{ detail.own }}/{{ detail.count }}</td>
                <td>{{ detail.skill.rank3 }}</td>
                <td>{{ detail.modX.rank3 }}</td>
                <td>{{ detail.modY.rank3 }}</td>
              </tr>
              </tbody>
            </table>
          </div>

          <div class="control_operator_card">
            <p>其中练度最高的十位干员是</p>

            <div class="opr_form">
              <div class="opr_card" v-for="(operator, char_index) in statisticsResult.max" :key="char_index"
              >
                <div class="opr_sprite_avatar_bg">
                  <div :class="getOperatorSprite(operator.charId)"></div>
                  <img :src="`/image/survey/rank/elite${operator.elite}.png`" class="opr_elite" alt="">
                  <div class="opr_level">
                    {{ operator.level }}
                  </div>
                  <span class="sprite_alt_name">{{ operator.name }}</span>
                </div>
                <div v-for="(skill,index) in operator.skill" :key="index" class="opr_sprite_skill_bg">
                  <div :class="getSkillSprite(skill.iconId)"></div>
                  <img :src="`/image/survey/skill-rank-${operator[`skill${index+1}`]}.jpg`"
                       v-show="operator[`skill${index+1}`]>0" class="opr_skill_rank">
                  <span class="sprite_alt">{{ skill.name }}</span>
                </div>
                <div v-for="(equip,index) in operator.equip" :key="index" class="opr_sprite_skill_bg">
                  <img :src="`/image/survey/mod-icon/${equip.typeIcon}.png`" alt="" class="opr_equip_image">
                  <img :src="`/image/survey/skill-rank-${operator[`mod${equip.typeName2}`]}.jpg`"
                       v-show="operator[`mod${equip.typeName2}`]>0" class="opr_skill_rank">
                  <div class="sprite_alt">{{ `${equip.typeName1}-${equip.typeName2}` }}</div>
                </div>
                <div class="opr_sprite_skill_bg">
                  <div :class="getItemSprite('AP_GAMEPLAY')"></div>
                  <span class="sprite_alt">{{ operator.apCost.toFixed(0) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!--          材料统计-->
        <div class="control_bar"
             style="line-height: 32px;font-weight: 600;font-size: 24px;padding: 12px 12px 12px 12px;">
          总计消耗{{ ap_cost_count.toFixed(0) }} 理智
        </div>
        <button class="btn btn_blue" @click="splitMaterialByRarity(5)">不拆分</button>
        <button class="btn btn_blue" @click="splitMaterialByRarity(4)">拆分材料到紫色品质</button>
        <button class="btn btn_blue" @click="splitMaterialByRarity(3)">拆分材料到蓝色品质</button>
        <div class="control_bar item_cost_wrap" v-for="(itemList,type) in item_cost_list"
             :key="type">
          <div v-for="(item,index) in itemList" :key="index" class="item_cost_card">
            <div class="image_item_wrap">
              <div :class="getSprite(item.id,'item')"></div>
              <div class="item_count">
                {{ strShowLength(item.count) }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </c-collapse-item>


    <!--    干员推荐-->
    <c-collapse-item v-model:visible="collapseRecommendVisible" :name="'recommend'">
      <div class="control_bar_wrap">
        <h2>干员练度推荐</h2> <span>（测试）</span>
        <div class="opr_form">
          <div class="opr_card" v-for="(recommend,index) in operatorRecommendList" :key="index">
            <div class="opr_sprite_avatar_bg">
              <div :class="getOperatorSprite(recommend.charId)"></div>
              <div class="sprite_alt_name">{{ recommend.name }}</div>
            </div>
            <div v-show="recommend.info.type==='skill'" class="opr_sprite_skill_bg">
              <div :class="getSkillSprite(recommend.info.iconId)"></div>
              <div class="sprite_alt">{{ recommend.info.name }}</div>
            </div>
            <div v-show="recommend.info.type==='equip'" class="opr_sprite_skill_bg">
              <img :src="`/image/survey/mod-icon/${recommend.info.iconId}.png`" alt="" class="opr_equip_image">
              <div class="sprite_alt">{{ recommend.info.iconId }}</div>
            </div>

            <div class="recommend_text">
              {{ `本站平均练度为${recommend.avg.toFixed(2)}级` }} <br>
              {{ `提升到3级的人占比为${(recommend.ratio * 100).toFixed(2)}%` }}
            </div>

          </div>
        </div>
      </div>
    </c-collapse-item>

    <!--   干员表单-->
    <div class="opr_form">
      <div class="opr_card" v-for="(operator, char_index) in operatorList" :key="char_index"
           @click="updateOperatorPopup(char_index)">
        <div class="opr_sprite_avatar_bg">
          <div :class="getOperatorSprite(operator.charId)"></div>
          <img :src="`/image/survey/rank/elite${operator.elite}.png`" class="opr_elite" alt="">
          <div class="opr_level">
            {{ operator.level }}
          </div>
          <div class="sprite_alt_name">{{ operator.name }}</div>
        </div>

        <div v-for="(skill,index) in operator.skill" :key="index" class="opr_sprite_skill_bg">
          <div :class="getSkillSprite(skill.iconId)"></div>
          <img :src="`/image/survey/skill-rank-${operator[`skill${index+1}`]}.jpg`"
               v-show="operator[`skill${index+1}`]>0" class="opr_skill_rank">
          <div class="sprite_alt">{{ skill.name }}</div>
        </div>
        <div v-for="(equip,index) in operator.equip" :key="index" class="opr_sprite_skill_bg">
          <!--          <div :class="getEquipSprite(operator[`mod${equip.typeName2}`])"></div>-->
          <img :src="`/image/survey/mod-icon/${equip.typeIcon}.png`" alt="" class="opr_equip_image">
          <img :src="`/image/survey/skill-rank-${operator[`mod${equip.typeName2}`]}.jpg`"
               v-show="operator[`mod${equip.typeName2}`]>0" class="opr_skill_rank">
          <div class="sprite_alt">{{ `${equip.typeName1}-${equip.typeName2}` }}</div>
        </div>
      </div>
    </div>


    <div class="opr_load_btn" @click="loadCompleteData()">加载完整数据</div>

    <c-popup v-model="operatorPopupVisible">

      <div class="opr_card" style="margin:12px auto 0 auto">
        <div class="opr_sprite_avatar_bg">
          <div :class="getOperatorSprite(operatorPopupData.charId)"></div>
          <img :src="`/image/survey/rank/elite${operatorPopupData.elite}.png`" class="opr_elite" alt="">
          <div class="opr_level">
            {{ operatorPopupData.level }}
          </div>
        </div>
        <div v-for="(skill,index) in operatorPopupData.skill" :key="index" class="opr_sprite_skill_bg">
          <div :class="getSkillSprite(skill.iconId)"></div>
          <img :src="`/image/survey/skill-rank-${operatorPopupData[`skill${index+1}`]}.jpg`"
               v-show="operatorPopupData[`skill${index+1}`]>0" class="opr_skill_rank">
          <div class="sprite_alt">{{ skill.name }}</div>
        </div>
        <div v-for="(equip,index) in operatorPopupData.equip" :key="index" class="opr_sprite_skill_bg">
          <img :src="`/image/survey/mod-icon/${equip.typeIcon}.png`" alt="" class="opr_equip_image">
          <img :src="`/image/survey/skill-rank-${operatorPopupData[`mod${equip.typeName2}`]}.jpg`"
               v-show="operatorPopupData[`mod${equip.typeName2}`]>0" class="opr_skill_rank">
          <div class="sprite_alt">{{ `${equip.typeName1}-${equip.typeName2}` }}</div>
        </div>
      </div>


      <div class="opr_option_bar_wrap">

        <!--        选项-->
        <div class="opr_options">
          <div class="opr_option_title">练度项</div>
          <div class="opr_option_bar">
            <div class="opr_sprite_skill_bg">
              <img :src="`/image/survey/rank/elite${operatorPopupData.elite}.png`" class="img_skill_rank">
            </div>
          </div>
          <div class="opr_option_bar" v-for="(skill,index) in operatorPopupData.skill" :key="index">
            <div class="opr_sprite_skill_bg">
              <div :class="getSkillSprite(skill.iconId)"
                   @click="updateOperatorData(operatorPopupData.charId,`skill${index+1}`,0)"></div>
              <img :src="`/image/survey/skill-rank-${operatorPopupData[`skill${index+1}`]}.jpg`"
                   v-show="operatorPopupData[`skill${index+1}`]>0" class="opr_skill_rank">
            </div>
          </div>

          <div class="opr_option_bar" v-for="(equip,index) in operatorPopupData.equip" :key="index">
            <div class="opr_sprite_mod_bg">
              <img :src="`/image/survey/mod-icon/${equip.typeIcon}.png`" alt="" class="opr_equip_image"
                   @click="updateOperatorData(operatorPopupData.charId,`mod${equip.typeName2}`,0)">
              <div class="sprite_alt">{{ `${equip.typeName1}-${equip.typeName2}` }}</div>
            </div>
          </div>
        </div>

        <!--        当前练度-->
        <div class="opr_options">
          <div class="opr_option_title">修改当前练度</div>
          <div class="opr_option_bar">
            <div v-for="rank in RANK_TABLE.slice(0,3)" :key="rank"
                 @click="updateOperatorData(operatorPopupData.charId,`elite`,rank)"
                 :class="dataOptionClass(operatorPopupData.charId,rank,`elite`)">
              <img :src="`/image/survey/rank/elite${rank}.png`" class="img_skill_rank">
              <!--              <div :class="getOptionEliteSprite(`elite${rank}`)"></div>-->
            </div>
          </div>

          <div class="opr_option_bar" v-for="(skill,index) in operatorPopupData.skill" :key="index">
            <div v-for="rank in RANK_TABLE.slice(1,4)" :key="rank"
                 @click="updateOperatorData(operatorPopupData.charId,`skill${index+1}`,rank)"
                 :class="dataOptionClass(operatorPopupData.charId,rank,`skill${index+1}`)">
              <img :src="`/image/survey/rank/skill-rank-${rank}.png`" class="img_skill_rank"/>
            </div>
          </div>
          <div class="opr_option_bar" v-for="(equip,index) in operatorPopupData.equip" :key="index">
            <div v-for="rank in RANK_TABLE.slice(1,4)" :key="rank"
                 @click="updateOperatorData(operatorPopupData.charId,`mod${equip.typeName2}`,rank)"
                 :class="dataOptionClass(operatorPopupData.charId,rank,`mod${equip.typeName2}`)">
              <img :src="`/image/survey/rank/mod-rank-${rank}.png`" class="img_mod_rank"/>
            </div>
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
import operatorStatistics from "/src/pages/survey/js/operatorStatistics"
import surveyApi from "/src/api/surveyUser";
import surveyOperatorApi from "/src/api/surveyOperator"
import sklandApi from '/src/api/skland'
import {onMounted, ref} from "vue";
import {http} from "/src/api/baseURL";
import request from "/src/api/requestBase";
import operatorRecommend from "/src/pages/survey/js/operatorRecommend";
import character_table from '/src/static/json/survey/character_table_simple.json'


import "/src/assets/css/survey/survey_character.css";
import "/src/assets/css/survey/operator.css";

let RANK_TABLE = ref([0, 1, 2, 3, 4, 5, 6]);  //等级
let RARITY_TABLE = [1, 2, 3, 4, 5, 6];  //星级

let userData = ref({userName: "未登录", status: -100, token: void 0});  //用户信息

/**
 * 获取本地缓存的用户信息
 */
function getCacheUserData() {
  let cacheData = localStorage.getItem("globalUserData");
  if (!cacheData) {
    // cMessage('未登录或登录失效', 'error')
  } else {
    userData.value = JSON.parse(cacheData);
  }
}

/**
 * 检查用户状态
 * @param notice 是否弹出提示
 * @returns {boolean} 状态
 */
function checkUserStatus(notice) {
  if (!userData.value.token) {
    if (notice) cMessage('请先注册或登录一图流账号', 'error')
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
    cred: skland_CRED_and_SECRET.value
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


let operatorTable = ref(character_table);
let operatorList = ref([])  //干员列表

/**
 * 找回填写过的角色信息
 */
function getOperatorData() {
  //检查是否登录
  if (checkUserStatus(false)) {
    loadDisplayData()
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
    loadDisplayData()
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
  return new Promise((resolve) => setTimeout(resolve,time))
}

let maxOperatorDisplayQuantity = 10;

/**
 * 分段加载干员数据
 * @returns {Promise<void>}
 */
async function segmentedLoading() {
  operatorList.value = []
  for (const charId in operatorTable.value) {
    const operator = operatorTable.value[charId]
    if (operatorList.value.length >= maxOperatorDisplayQuantity) {
      await sleep(500)

      maxOperatorDisplayQuantity += 10;
    }
    if (operator.show) {
      operatorList.value.push(operator)
    }
  }
}

function loadDisplayData(){
  operatorList.value = []
  for (const charId in operatorTable.value) {
    const operator = operatorTable.value[charId]
    if (operatorList.value.length >= 12) {
     break;
    }
    if (operator.show) {
      operatorList.value.push(operator)
    }
  }
}

let isCompleteData = ref(false)

function loadCompleteData(){
  operatorList.value = []
  for (const charId in operatorTable.value) {
    const operator = operatorTable.value[charId]
    if (operator.show) {
      operatorList.value.push(operator)
    }
  }
  isCompleteData.value = true
}

/**
 * 导出评分表的excel
 */
function exportExcel() {
  const export_excel_url = http + "survey/operator/export?token=" + userData.value.token;
  const element = document.createElement("a");
  element.download = "form.xlsx";
  element.style.display = "none";
  element.href = export_excel_url;
  element.click();
}


let importPopupVisible = ref(false)  //导入教程弹窗显示状态
let skland_CRED_and_SECRET = ref("");  //森空岛cred
let bindAccount = ref(false) //玩家uid是否绑定了一图流账号
let bindingList = ref([])  //绑定列表
let defaultUid = ref('')  //默认uid
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

  //替换掉cred和secret的引号
  skland_CRED_and_SECRET.value = skland_CRED_and_SECRET.value
      .replace(/\s+/g, '')
      .replace(/["']/g, '')

  //将cred和secret分开
  const textArr = skland_CRED_and_SECRET.value.split(',')
  const cred = textArr[0]
  const secret = textArr[1]

  //获取绑定信息
  const playerBinding = await sklandApi.getPlayBinding('/api/v1/game/player/binding', '', secret, cred);

  bindingList.value = playerBinding.bindingList
  defaultUid.value = playerBinding.uid

  const playerInfo = await sklandApi.getPlayerInfo(
      '/api/v1/game/player/info',
      `uid=${playerBinding.uid}`,
      secret,
      cred,
      playerBinding.uid)

  importFlag.value = true

  await uploadSKLandData({
    token: userData.value.token,
    data: JSON.stringify(playerInfo)
  })
}

/**
 * 如果导入错误可以自己选择uid进行导入
 * @param uid 玩家uid
 * @returns {Promise<void>}
 */
async function importSKLandOperatorDataByUid(uid) {

  if (checkUserStatus(true)) return;

  skland_CRED_and_SECRET.value = skland_CRED_and_SECRET.value
      .replace(/\s+/g, '')
      .replace(/["']/g, '')

  const textArr = skland_CRED_and_SECRET.value.split(',')

  const cred = textArr[0]
  const secret = textArr[1]

  const playerInfo = await sklandApi.getPlayerInfo(
      '/api/v1/game/player/info',
      `uid=${uid}`,
      secret,
      cred,
      uid)
  await uploadSKLandData({
    token: userData.value.token.toString(),
    data: JSON.stringify(playerInfo)
  })
}

/**
 * 上传获取到的森空岛干员数据
 * @param token 用户凭证
 * @param data 干员数据
 * @returns {Promise<void>}
 */
async function uploadSKLandData({token, data}) {
  await request({
    url: 'survey/operator/import/skland/v2',
    method: "post",
    data: {token, data}
  }).then(response => {
    response = response.data
    upload_message.value = response.data;
    if (response.code === 20004) {
      cMessage("您已经注册导入过了", "error");
      bindAccount.value = true;
      return;
    }

    if (response.code === 200) {
      cMessage("森空岛数据导入成功");
      bindAccount.value = false;
      getOperatorData()
    } else {
      cMessage(response.msg, "error");
    }
  })
}

//选择导入uid的按钮样式
function chooseUidClass(uid) {
  if (uid === defaultUid.value) return 'btn_blue'
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


// eslint-disable-next-line
let last_upload_time_stamp = 1689425013364; //上次上传时间的时间戳
let upload_message = ref({updateTime: "", affectedRows: 0, registered: false, userName: ''}); //上传APi返回的信息
let selectedCharId = ref({}); //每次点击操作记录下被更新的干员的索引，只上传被修改过的干员

/**
 * 自动上传风评表
 */
function automaticUpload() {
  //方法触发时的时间戳
  // const now_upload_time_stamp = Date.parse(new Date().toString());
  // //与上一次自动上传时间的间隔
  // let upload_frequency = now_upload_time_stamp - last_upload_time_stamp;
  // // 检查用户是否登录
  // if (userData.value.token == void 0) {
  //   console.log(userData.value.token == void 0);
  //   cMessage("未登录", "error");
  //   return;
  // }
  // //上传间隔小于30s退出方法
  // if (upload_frequency < 30000) return;
  // console.log("上传频率：", upload_frequency / 1000, "s");
  //
  // //上传的数据
  // let upload_list = createUploadData();
  //
  // last_upload_time_stamp = now_upload_time_stamp;
  //
  // surveyApi.uploadCharacter(upload_list, userData.value.token).then((response) => {
  //   upload_message.value = response.data;
  //   selectedCharId.value = {};
  //   cMessage("自动保存成功");
  // });
}

let upload_limit_data = ref(1699515633566)

/**
 * 手动上传
 */
function upload() {
  let now_time_stamp = Date.now();

  if ((now_time_stamp - upload_limit_data.value) < 5000) {
    console.log('保存过于频繁')
    return;
  }



  upload_limit_data.value = now_time_stamp
  let uploadList = createUploadData();

  surveyApi.uploadCharacter(uploadList, userData.value.token).then((response) => {
    upload_message.value = response.data;
    cMessage("保存成功");
    selectedCharId.value = {};
  });
}

let upload_file_name = ref("上传的文件名");

/**
 * 将需要上传的数据去除无用信息
 */
function createUploadData() {
  let upload_list = [];


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
    upload_list.push(operator);
  }

  return upload_list;
}


/**
 * Excel文件上传
 */
// eslint-disable-next-line
function getUploadFileName() {
  const file = document.getElementById("uploadInput");
  upload_file_name.value = file.files[0].name;
  let formData = new FormData();
  formData.append("file", file.files[0]);

  surveyApi.uploadCharacterByExcel(formData, userData.value.token).then((response) => {
    // console.log(response.data);
    cMessage("新增了 " + response.data.insertRows + " 条");
    cMessage("更新了 " + response.data.updateRows + " 条");
  });
}

//通过excel上传
// function uploadByExcel() {
//   const file = document.getElementById("uploadInput");
//   let formData = new FormData();
//   formData.append("file", file.files[0]);
//   console.log(file);
//   surveyApi.uploadCharacterByExcel(formData, userData.value.token).then((response) => {
//     // console.log(response.data);
//     cMessage("新增了 " + response.data.insertRows + " 条");
//     cMessage("更新了 " + response.data.updateRows + " 条");
//   });
// }

// eslint-disable-next-line no-unused-vars
let maaData = ref([{}]);

// eslint-disable-next-line
function maaData1() {
  // let dataJson = JSON.parse(maaData.value);

}

let operatorPopupVisible = ref(false)
let operatorPopupData = ref({})

/**
 * 更新修改干员练度弹窗内的干员数据
 * @param index
 */
function updateOperatorPopup(index) {
  // console.log(operator_popup_visible.value)
  operatorPopupVisible.value = true;
  operatorPopupData.value = operatorList.value[index]
}

/**
 * 修改干员练度
 * @param charId 干员id
 * @param property 属性
 * @param newValue 新值
 */
function updateOperatorData(charId, property, newValue) {
  operatorPopupData.value[property] = newValue
  operatorTable.value[charId][property] = newValue
  selectedCharId.value[charId] = charId
}

function dataOptionClass(charId, current, property) {
  if (current === operatorPopupData.value[property]) return 'opr_option_selected'
  return 'opr_option'
}


//判断按钮是否选中
function selectedBtn(property, rule) {
  if (filterCondition.value[property].indexOf(rule) > -1) {
    return "btn btn_blue";
  }
  return "btn";
}

let collapseImportFilter = ref(false)

let filterCondition = ref({
  rarity: [6],
  profession: [],
  year: [],
  own: [],
  equip: [],
  itemObtainApproach: [],
  TODO: []
});

function collapseFilter() {
  collapseImportFilter.value = !collapseImportFilter.value
}

/**
 *  增加筛选规则
 * @param property  干员属性
 * @param condition 筛选条件
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
 * 干员数组operator_list排序
 * @param property 干员属性
 */
function sortOperatorList(property) {

  if(!isCompleteData.value){
    loadCompleteData()
  }
  sortProperty.value[property] = !sortProperty.value[property]
  operatorList.value.sort((a, b) => {
    if(sortProperty.value[property]){
      return a[property] - b[property];
    }else {
      return b[property] - a[property];
    }
  });
}

//材料消耗数量
let item_cost_list = ref([])
//理智消耗数量
let ap_cost_count = ref(0)
//材料消耗数量
let item_cost_map = ref({})

let collapse_statistics_visible = ref(false)

function statisticsCollapse() {
  statistics()
  collapse_statistics_visible.value = !collapse_statistics_visible.value
}


let statisticsResult = ref({
  max: [],
  total: {notOwn: [], count: 0, own: 0, skill: {}, mod: {}, modX: {}, modY: {}, modD: {}},
  rarity6: {notOwn: [], count: 0, own: 0, skill: {}, mod: {}, modX: {}, modY: {}, modD: {}},
  rarity5: {notOwn: [], count: 0, own: 0, skill: {}, mod: {}, modX: {}, modY: {}, modD: {}},
  rarity4: {notOwn: [], count: 0, own: 0, skill: {}, mod: {}, modX: {}, modY: {}, modD: {}},
  rarity3: {notOwn: [], count: 0, own: 0, skill: {}, mod: {}, modX: {}, modY: {}, modD: {}},
  rarity2: {notOwn: [], count: 0, own: 0, skill: {}, mod: {}, modX: {}, modY: {}, modD: {}},
  rarity1: {notOwn: [], count: 0, own: 0, skill: {}, mod: {}, modX: {}, modY: {}, modD: {}},
})

let statistics_detail = ref([statisticsResult.value.rarity6, statisticsResult.value.rarity5,
  statisticsResult.value.rarity4, statisticsResult.value.rarity3,
  statisticsResult.value.rarity2, statisticsResult.value.rarity1])

//各种统计
function statistics() {
  const result = operatorStatistics.calAPCost(operatorTable.value);
  item_cost_map.value = result.itemMap;
  item_cost_list.value = result.itemList;
  ap_cost_count.value = result.apCostCount;

  statisticsResult.value = operatorStatistics.operatorStatistics(operatorTable.value)

  statistics_detail.value = [
    statisticsResult.value.rarity6, statisticsResult.value.rarity5,
    statisticsResult.value.rarity4, statisticsResult.value.rarity3,
    statisticsResult.value.rarity2, statisticsResult.value.rarity1
  ]
}


/**
 * 根据材料最大星级对材料进行拆解计算
 * @param highest_rarity  材料最大星级
 */
function splitMaterialByRarity(highest_rarity) {
  item_cost_list.value = operatorStatistics.splitMaterial(highest_rarity, item_cost_map.value);
}


// eslint-disable-next-line
function toThousands(num) {
  return (num || 0).toString().replace(/(\d)(?=(?:\d{3})+$)/g, '$1,');
}

let collapseRecommendVisible = ref(false)
let operatorRecommendList = ref([])

async function getOperatorRecommend() {
  operatorRecommendList.value = await operatorRecommend.operatorRecommend(operatorTable.value)
  collapseRecommendVisible.value = !collapseRecommendVisible.value;
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


function toSkland() {
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

let btn_status = ref({
  btn_import: true,
  btn_filter: false,
  btn_statistics: false,
  btn_plan: false,
  btn_recommend: false
})  //所有按钮的状态

/**
 * 点击按钮改变按钮状态
 * @param btn_id 按钮id
 */
function clickBtn(btn_id) {
  btn_status.value[btn_id] = !btn_status.value[btn_id]
}

//转跳罗德岛基建Beta
function feedback() {
  const excelHref = "https://docs.qq.com/form/page/DVVNyd2J5RmV2UndQ"
  const element = document.createElement("a");
  element.style.display = "none";
  element.href = excelHref;
  element.click();
}


/**
 * 获取雪碧图
 * @param id 图片id string
 * @param type 图片类型 string (每类图片对应的css不一样）
 * @returns {string} css样式名
 */
function getSprite(id, type) {
  if ("mod" === type) return "bg-" + id + " sprite_mod";
  if ("mod_rank" === type) return "bg-" + id + " sprite_mod_rank";
  if ("skill" === type) return "bg-" + id + " sprite_skill";
  if ("elite" === type) return "bg-" + id + " sprite_elite";
  if ("potential" === type) return "bg-" + id + " sprite_potential";
  if ("icon" === type) return "bg-skill_icon_" + id + " sprite_skill_icon";
  if ("item" === type) return 'bg-' + id + " image_item"
  return "bg-" + id + " sprite_avatar";
}


function getOperatorSprite(id) {
  return "bg-" + id + " opr_sprite_avatar";
}

function getSkillSprite(id) {
  return "bg-skill_icon_" + id + " opr_sprite_skill";
}

function getItemSprite(id) {
  return 'bg-' + id + " opr_apCost"
}


onMounted(() => {
  getCacheUserData()
  getOperatorData();
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

.survey_character_page {

  color: var(--c-text-color);
}

.web_url {
  padding: 0 8px 0 8px;
  color: dodgerblue;
  cursor: pointer;
}

.control_desc {
  margin: 2px 0;
  line-height: 28px;

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