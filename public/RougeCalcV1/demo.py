import random
import math
import wx
import wx.lib.agw.ultimatelistctrl as ULC
import wx.adv as ADV
import json
import sys, os
import ctypes
import webbrowser

title_text = "通天联赛计算器 by 巴别塔攻略组  |  "
background_color = "#F3F3F3"
foreground_color = "#276CBC"
fake_background = "#F9FAFC"
outline_color = "#B7D5F7"
yes_no_choice = ["是", "否"]
challenge_text = []
challenge_score = []
unique_challenge_text = []
unique_challenge_score = []
boss_score = []
boss_selected = [0] * 12
boss_image_names = [
    "b-7-b",
    "b-6-b",
    "b-5-b",
    "b-4-b",
    "b-7",
    "b-6",
    "b-5",
    "r-1",
    "r-2",
    "r-3",
    "r-4",
    "r-5"
]
boss_images = []
two_ending = 0
three_ending = 0
both_three_four_ending = 0
battle_text = [
    "关卡类型",
    "关卡层数",
    "关卡名称",
    "是否无漏",
    "是否持有路网",
    "是否有捕猎惩罚",
    "特殊加分"
]
battle_isbanned = [False, True, True, False, False, False, True]
battle_types = ["紧急作战", "特殊作战"]
battle_levels = ["一层", "二层", "三层", "四层", "五层", "六层"]
battle_names = [
    ["死囚之夜", "度假村冤魂", "苔手", "待宰的兽群", "事不过四"],
    ["没有尽头的路", "低空机动", "违和", "幽影与鬼魅", "虫虫别回头", "还之彼身"],
    ["冰海疑影", "狡兽九窟", "弄假成真", "饥渴祭坛", "咫尺天涯", "思维折断", "恃强凌弱"],
    ["坍缩体的午后", "公司纠葛", "以守代攻", "大迁徙", "禁区", "应用测试", "杂音干扰", "冰凝之所"],
    ["人造物狂欢节", "乐理之灾", "亡者行军", "本能污染", "求敌得敌", "混乱的表象", "何处无山海", "生人勿近"],
    ["霜与沙", "生灵的终点"]
]
battle_special_names = ["呼吸", "大地醒转", "夺树者", "黄沙幻境", "天途半道", "惩罚", "豪华车队", "英雄无名", "正义使者", "亘古仇敌"]
battle_score = dict()
battle_special_score = dict() # [无漏，非无漏]
special_extra_title = dict()
special_extra_score = dict()
friend_link = [
    ("TOMIMI", "https://tomimi.cyou/zh/sami", "tomimi"),
    ("DPS计算器", "https://viktorlab.cn/akdata/dps/", "dpscalc"),
    ("PRTS.Maps", "https://mapcn.ark-nights.com/areas/rogue_3", "prtsmap")
]
relative_link = [
    # ("激励计划动态", "https://www.bilibili.com/blackboard/activity-oc3CbeDPRR.html"),
    ("比赛直播间", "https://live.bilibili.com/22476160")
]
credits_link = {
    "程序：" : [
        ("_noname", "https://space.bilibili.com/22275485")
    ],
    "美术：" : [
        ("里雪りあ", "https://space.bilibili.com/1684845011"),
        ("無冕Crownless", "https://space.bilibili.com/12786648")
    ]
}

use_special_unit = False
unit = ""
unit_score = 1
config = 0
config_path = [
    "settings/formal.json",
    "settings/firstinitial.json"
]

def resource_path(relative_path):
    if hasattr(sys, '_MEIPASS'):
        base_path = sys._MEIPASS
    else:
        base_path = os.path.abspath(".")

    return os.path.join(base_path, relative_path)

if os.name == 'nt':
    GDI32 = ctypes.WinDLL('gdi32')
    GDI32.AddFontResourceExW.argtypes = [ctypes.c_wchar_p, ctypes.c_uint, ctypes.c_void_p]

    GDI32.AddFontResourceExW(resource_path('font/Novecento WideMedium.otf'), 0x10, None)
    GDI32.AddFontResourceExW(resource_path('font/标小智无界黑.TTF'), 0x10, None)
    GDI32.AddFontResourceExW(resource_path('font/HARMONYOS_SANS_SC_REGULAR.TTF'), 0x10, None)

def init_settings():
    global challenge_text, unique_challenge_text, special_extra_title, special_extra_score, boss_score, battle_score, battle_special_score, two_ending, three_ending, both_three_four_ending
    if config == 2:
        challenge_text = ["隐藏敌人（鸭、熊、狗）", "四层失与得紧急作战", "五层失与得紧急作战", "黑色足迹紧急作战", "未抓取软Ban干员数量"]
        challenge_score.clear()
        unique_challenge_text = ["全程未取过钱", "全程未进过树篱之途"]
        unique_challenge_score.clear()
        special_extra_score.clear()

        for i in range(len(challenge_text)):
            challenge_score.append(random.randint(0, 300))
        for i in range(len(unique_challenge_text)):
            unique_challenge_score.append(random.randint(0, 300))
        boss_score.clear()
        for i in range(12):
            boss_score.append(random.randint(0, 300))

        for lst in battle_names:
            for name in lst:
                battle_score[name] = random.randint(0, 300)
        for name in battle_special_names:
            r = random.randint(0, 300)
            battle_special_score[name] = [int(r * 1.2), r]

        two_ending = random.randint(0, 300)
        three_ending = random.randint(0, 300)
        both_three_four_ending = random.randint(0, 300)
        special_extra_title = {
            "冰海疑影": ["1个污染躯壳", "17个污染躯壳"],
            "人造物狂欢节": ["0个突击动力甲", "1个突击动力甲", "2个突击动力甲"],
            "乐理之灾": ["3个小提琴家", "4个小提琴家"],
            "黄沙幻境": ["西/北风向", "东/南风向"],
            "英雄无名": ["击杀0个", "击杀1个", "击杀2个", "击杀3个", "击杀4个", "击杀5个", "击杀6个"]
        }
        special_extra_score["17个污染躯壳"] = random.randint(0, 300)
        r = random.randint(0, 300)
        special_extra_score["1个突击动力甲"] = r
        special_extra_score["2个突击动力甲"] = r * 2
        special_extra_score["4个小提琴家"] = random.randint(0, 300)
        special_extra_score["东/南风向"] = random.randint(0, 300)
        r = random.randint(0, 300)
        special_extra_score["击杀1个"] = r
        special_extra_score["击杀2个"] = r * 2
        special_extra_score["击杀3个"] = r * 3
        special_extra_score["击杀4个"] = r * 4
        special_extra_score["击杀5个"] = r * 5
        special_extra_score["击杀6个"] = r * 6
        return True

    with open(resource_path(config_path[config]), 'r', encoding='utf-8') as file:
        data = json.load(file)
        challenge_text.clear()
        challenge_score.clear()
        unique_challenge_text.clear()
        unique_challenge_score.clear()
        special_extra_title.clear()
        special_extra_score.clear()

        mp = data.get("challenge", dict())
        for key, value in mp.items():
            challenge_text.append(key)
            challenge_score.append(value)
        mp = data.get("unique_challenge", dict())
        for key, value in mp.items():
            unique_challenge_text.append(key)
            unique_challenge_score.append(value)
        boss_score = data.get("boss_score", [0] * 12)
        if len(boss_score) != 12:
            return False
        two_ending = data.get("two_ending", 0)
        three_ending = data.get("three_ending", 0)
        both_three_four_ending = data.get("both_three_four_ending", 0)
        battle_score = data.get("battle_score", dict())
        battle_special_score = data.get("battle_special_score", dict())
        mp = data.get("special_extra", dict())
        for key, value in mp.items():
            lst = []
            for key1, value1 in value.items():
                lst.append(key1)
                special_extra_score[key1] = value1
            special_extra_title[key] = lst
    
    return True

class SettingsPanel(wx.Panel):
    def __init__(self, parent):
        super(SettingsPanel, self).__init__(parent, style=wx.BORDER_NONE)

        self.back_image = wx.Bitmap(resource_path(f"images/back.png"), wx.BITMAP_TYPE_ANY)
        self.back_rect = wx.Rect(70, 170, 40, 40)
        self.Bind(wx.EVT_LEFT_UP, self.on_left_up)

        self.text_font = wx.Font(12, wx.FONTFAMILY_DEFAULT, wx.FONTSTYLE_NORMAL, wx.FONTWEIGHT_NORMAL, False, "HarmonyOS Sans SC")
        self.title_font = wx.Font(25, wx.FONTFAMILY_DEFAULT, wx.FONTSTYLE_NORMAL, wx.FONTWEIGHT_NORMAL, False, "标小智无界黑")

        self.settings_config_choice = wx.Choice(self, choices=["正赛分数配置", "海选分数配置", "随机分数配置"], pos=(400, 275), size=(120, 30))
        self.settings_config_choice.SetSelection(config)
        self.settings_config_choice.SetFont(self.text_font)
        self.settings_config_choice.Bind(wx.EVT_CHOICE, self.on_config_choice)
        self.last_config = config

        self.settings_unit_choice = wx.Choice(self, choices=yes_no_choice, pos=(400, 455), size=(120, 30))
        self.settings_unit_choice.SetSelection(1 - int(use_special_unit))
        self.settings_unit_choice.SetFont(self.text_font)
        self.settings_unit_choice.Bind(wx.EVT_CHOICE, self.on_unit_choice)

        self.unit_ctrl = wx.TextCtrl(self, id=1001, pos=(425, 494), size=(90, 24), style=wx.TE_CENTER | wx.NO_BORDER)
        self.unit_ctrl.SetFont(self.text_font)
        self.unit_ctrl.SetBackgroundColour(fake_background)
        self.unit_ctrl.SetValue(unit)

        self.unit_score_ctrl = wx.TextCtrl(self, id=1002, pos=(565, 494), size=(90, 24), style=wx.TE_CENTER | wx.NO_BORDER)
        self.unit_score_ctrl.SetFont(self.text_font)
        self.unit_score_ctrl.SetBackgroundColour(fake_background)
        self.unit_score_ctrl.SetValue(str(unit_score))
        self.unit_score_ctrl.Bind(wx.EVT_TEXT, self.on_text)
        self.unit_score_ctrl.Bind(wx.EVT_CHAR, self.on_char)

        if not use_special_unit:
            self.unit_ctrl.Hide()
            self.unit_score_ctrl.Hide()

        self.Bind(wx.EVT_PAINT, self.on_paint)
        self.Refresh()

    def on_paint(self, event):
        dc = wx.PaintDC(self)
        dc.SetBrush(wx.TRANSPARENT_BRUSH)
        dc.SetPen(wx.Pen(outline_color, 2))
        dc.DrawBitmap(background_image, 0, 0)
        dc.SetTextForeground(foreground_color)
        dc.SetFont(self.title_font)
        dc.DrawText("分数配置文件", 200, 220)
        dc.DrawText("分数单位设置", 200, 400)
        dc.DrawBitmap(self.back_image, self.back_rect.x, self.back_rect.y)

        dc.SetTextForeground("#000000")
        dc.SetFont(self.text_font)
        dc.DrawText("当前使用的分数配置文件：", 200, 278)
        dc.DrawText("是否使用自定义分数单位：", 200, 458)

        if self.settings_unit_choice.GetSelection() == 0:
            dc.DrawText("1　　　　　　　　=　　　　　　　　分", 400, 495)
            dc.DrawRoundedRectangle(420, 490, 100, 30, 10)
            dc.DrawRoundedRectangle(560, 490, 100, 30, 10)

    def on_unit_choice(self, event):
        if self.settings_unit_choice.GetSelection() == 0:
            self.unit_ctrl.Show()
            self.unit_score_ctrl.Show()
        else:
            self.unit_ctrl.Hide()
            self.unit_score_ctrl.Hide()
        self.RefreshRect(wx.Rect(200, 458, 500, 200))

    def on_config_choice(self, event):
        global config
        config = self.settings_config_choice.GetSelection()
        self.Parent.Title = title_text + self.settings_config_choice.GetStringSelection()

    def on_left_up(self, event):
        pos = event.GetPosition()
        if self.back_rect.Contains(pos):
            self.on_back_clicked()

    def on_back_clicked(self):
        global unit, unit_score, use_special_unit
        if self.settings_unit_choice.GetSelection() == 0:
            if self.unit_ctrl.GetValue() != "" and self.unit_score_ctrl.GetValue != "0":
                unit = self.unit_ctrl.GetValue()
                unit_score = int(self.unit_score_ctrl.GetValue())
                use_special_unit = True
        else:
            use_special_unit = False

        if self.last_config != config or config == 2:
            self.last_config = config
            self.Parent.close_settings(True)
        else:
            self.Parent.close_settings(False)

    def on_text(self, event):
        text_ctrl = event.GetEventObject()
        value = text_ctrl.GetValue()
        if not value:
            text_ctrl.SetValue("0")
            text_ctrl.SetForegroundColour("#808080")
        else:
            if value == "0":
                text_ctrl.SetForegroundColour("#808080")
            else:
                text_ctrl.SetForegroundColour("#000000")

    def on_char(self, event):
        text_ctrl = event.GetEventObject()
        current_value = text_ctrl.GetValue()
        new_char = chr(event.GetKeyCode())
        if new_char.isdigit():
            if current_value == "0":
                text_ctrl.SetValue(new_char)
                text_ctrl.SetInsertionPointEnd()
            elif len(current_value) < 5:
                event.Skip()
        elif event.GetKeyCode() in [wx.WXK_CONTROL_A, wx.WXK_BACK, wx.WXK_DELETE, wx.WXK_LEFT, wx.WXK_RIGHT, wx.WXK_UP, wx.WXK_DOWN, wx.WXK_HOME, wx.WXK_END, wx.WXK_TAB]:
            event.Skip()

class InformationPanel(wx.Panel):
    def __init__(self, parent):
        super(InformationPanel, self).__init__(parent, style=wx.BORDER_NONE)

        self.SetBackgroundColour(background_color)
        self.back_image = wx.Bitmap(resource_path(f"images/back.png"), wx.BITMAP_TYPE_ANY)
        self.back_rect = wx.Rect(70, 170, 40, 40)
        self.Bind(wx.EVT_LEFT_UP, self.on_left_up)
        self.Bind(wx.EVT_MOTION, self.on_mouse_move)

        self.title_font = wx.Font(25, wx.FONTFAMILY_DEFAULT, wx.FONTSTYLE_NORMAL, wx.FONTWEIGHT_NORMAL, False, "标小智无界黑")
        self.text_font = wx.Font(12, wx.FONTFAMILY_DEFAULT, wx.FONTSTYLE_NORMAL, wx.FONTWEIGHT_NORMAL, False, "HarmonyOS Sans SC")

        self.links = []
        self.friend_image = []
        self.friend_image_rect = []
        posx, posy = 200, 270
        for i in range(len(friend_link)):
            self.friend_image.append(wx.Bitmap(resource_path(f"images/{friend_link[i][2]}.png"), wx.BITMAP_TYPE_ANY))
            self.friend_image_rect.append(wx.Rect(posx, posy, 128, 128))

            link = ADV.HyperlinkCtrl(self, id=wx.ID_ANY, label=friend_link[i][0], url=friend_link[i][1])
            x, y = posx + 55, posy + 135
            x -= link.GetSize().width // 2
            link.SetPosition((x, y))
            link.SetFont(self.text_font)
            link.SetBackgroundColour(fake_background)
            link.SetSize(wx.Size(link.GetTextExtent(friend_link[i][0])))
            self.links.append(link)
            posx += 180

        posx, posy = 200, 550
        for i in range(len(relative_link)):
            link = ADV.HyperlinkCtrl(self, id=wx.ID_ANY, label=relative_link[i][0], url=relative_link[i][1], pos=(posx, posy))
            link.SetFont(self.text_font)
            link.SetBackgroundColour(fake_background)
            link.SetSize(wx.Size(link.GetTextExtent(relative_link[i][0])))
            self.links.append(link)
            posy += 30

        posy = 550
        self.credit_label = []
        for key, value in credits_link.items():
            posx = 600
            label = wx.StaticText(self, label=key, pos=(posx, posy))
            label.SetBackgroundColour(fake_background)
            label.SetFont(self.text_font)
            posx += label.GetSize().GetWidth() + 5
            self.credit_label.append(label)

            for val in value:
                link = ADV.HyperlinkCtrl(self, id=wx.ID_ANY, label=val[0], url=val[1], pos=(posx, posy))
                link.SetFont(self.text_font)
                link.SetBackgroundColour(fake_background)
                link.SetSize(wx.Size(link.GetTextExtent(val[0])))
                posy += 30
                self.links.append(link)

        self.Bind(wx.EVT_PAINT, self.on_paint)
        self.Refresh()

    def on_paint(self, event):
        dc = wx.PaintDC(self)
        dc.SetBrush(wx.TRANSPARENT_BRUSH)
        dc.DrawBitmap(background_image, 0, 0)

        dc.SetTextForeground(foreground_color)
        dc.SetFont(self.title_font)
        dc.DrawText("友情链接", 200, 220)
        dc.DrawText("相关链接", 200, 500)
        dc.DrawText("制作人员", 600, 500)
        dc.DrawBitmap(self.back_image, self.back_rect.x, self.back_rect.y)

        for i in range(len(friend_link)):
            dc.DrawBitmap(self.friend_image[i], self.friend_image_rect[i].x, self.friend_image_rect[i].y)
    
    def on_left_up(self, event):
        pos = event.GetPosition()
        if self.back_rect.Contains(pos):
            self.on_back_clicked()
        else:
            for i in range(len(friend_link)):
                if self.friend_image_rect[i].Contains(pos):
                    webbrowser.open(friend_link[i][1])
    
    def on_mouse_move(self, event):
        pos = event.GetPosition()
        inRect = False
        for i in range(len(friend_link)):
            if self.friend_image_rect[i].Contains(pos):
                inRect = True
                break
        if inRect:
            self.SetCursor(wx.Cursor(wx.CURSOR_HAND))
        else:
            self.SetCursor(wx.Cursor(wx.CURSOR_ARROW))

    def on_back_clicked(self):
        self.Parent.close_information()

class BattlePanel():
    def __init__(self, parent : wx.Panel, rect):
        self.parent = parent
        self.rect = rect
        
        self.list = []
        self.detail_list = []
        self.text_font = wx.Font(12, wx.FONTFAMILY_DEFAULT, wx.FONTSTYLE_NORMAL, wx.FONTWEIGHT_NORMAL, False, "HarmonyOS Sans SC")
        self.highlight = -1
        self.true_highlight = -1

    def add_item(self, name, score, detail):
        self.list.append((name, score))
        self.detail_list.append(detail)
        self.refresh()
    
    def remove_all_items(self):
        self.list.clear()
        self.detail_list.clear()
        self.refresh()
    
    def delete_item(self):
        if self.true_highlight != -1 and self.true_highlight < len(self.list):
            self.list.pop(self.true_highlight)
            self.detail_list.pop(self.true_highlight)
            self.true_highlight = -1
            self.refresh()
    
    def update_highlight(self, index):
        if index != self.highlight:
            self.highlight = index
            self.refresh()
    
    def refresh(self):
        self.parent.RefreshRect(self.rect)
    
    def recalc(self):
        for i in range(len(self.list)):
            name = self.list[i][0]
            total = 0
            if self.detail_list[i][0] == 0:
                if name in battle_score.keys():
                    total += battle_score[name]
                if self.detail_list[i][2] == 0:
                    total += 20
                times = 1.0
                if self.detail_list[i][1] == 0:
                    times += 0.2
                if self.detail_list[i][3] == 0:
                    times -= 0.7
                total *= times
            else:
                total = battle_special_score[name][self.detail_list[i][1]]
            extra_item = self.detail_list[i][4]
            if extra_item in special_extra_score.keys():
                total += special_extra_score[extra_item]

            self.list[i] = (name, str(int(total)))

    def get_total_score(self):
        ret = 0
        for battle in self.list:
            ret += int(battle[1])
        return ret

class CalcPanel(wx.Panel):
    def __init__(self, parent):
        super(CalcPanel, self).__init__(parent, style=wx.BORDER_NONE | wx.BG_STYLE_TRANSPARENT)

        self.SetBackgroundColour(background_color)
        self.Bind(wx.EVT_MOTION, self.on_mouse_move)
        self.Bind(wx.EVT_LEFT_DOWN, self.on_left_down)
        self.Bind(wx.EVT_LEFT_UP, self.on_left_up)
        self.timer = wx.Timer(self)
        self.Bind(wx.EVT_TIMER, self.on_timer, self.timer)
        self.is_mouse_down = False
        text_font = wx.Font(12, wx.FONTFAMILY_DEFAULT, wx.FONTSTYLE_NORMAL, wx.FONTWEIGHT_NORMAL, False, "HarmonyOS Sans SC")
        self.final_font = wx.Font(35, wx.FONTFAMILY_DEFAULT, wx.FONTSTYLE_NORMAL, wx.FONTWEIGHT_NORMAL, False, "Novecento Wide Medium")
        self.final_unit_font = wx.Font(15, wx.FONTFAMILY_DEFAULT, wx.FONTSTYLE_NORMAL, wx.FONTWEIGHT_NORMAL, False, "HarmonyOS Sans SC")
        bigger_text_font = wx.Font(13, wx.FONTFAMILY_DEFAULT, wx.FONTSTYLE_NORMAL, wx.FONTWEIGHT_NORMAL, False, "HarmonyOS Sans SC")
        self.bold_text_font = wx.Font(13, wx.FONTFAMILY_DEFAULT, wx.FONTSTYLE_NORMAL, wx.FONTWEIGHT_BOLD, False, "HarmonyOS Sans SC")
        self.text_font = text_font
        self.title_font = wx.Font(25, wx.FONTFAMILY_DEFAULT, wx.FONTSTYLE_NORMAL, wx.FONTWEIGHT_NORMAL, False, "标小智无界黑")
        self.button_text_font = wx.Font(9, wx.FONTFAMILY_DEFAULT, wx.FONTSTYLE_NORMAL, wx.FONTWEIGHT_NORMAL, False, "HarmonyOS Sans SC")

        self.settings_image = wx.Bitmap(resource_path(f"images/settings.png"), wx.BITMAP_TYPE_ANY)
        self.settings_rect = wx.Rect(1110, 80, 40, 40)

        self.information_image = wx.Bitmap(resource_path(f"images/information.png"), wx.BITMAP_TYPE_ANY)
        self.information_rect = wx.Rect(1170, 80, 40, 40)

        self.delete_image = wx.Bitmap(resource_path(f"images/delete.png"), wx.BITMAP_TYPE_ANY)
        self.delete_rect = wx.Rect(1168, 205, 37, 26)

        # 挑战分数
        self.challenge_text_ctrl = []
        self.challenge_choice = []
        self.challenge_label = []
        self.init_challenge()

        # 结局分数
        self.boss_button = []
        posx = 69
        posy = 584
        for i in range(len(boss_selected)):
            image = wx.Bitmap(resource_path(f"images/{boss_image_names[i]}.png"), wx.BITMAP_TYPE_ANY)
            boss_images.append(image)
            button = wx.BitmapButton(self, 100 + i, image, pos=(posx, posy), size=(64, 64))
            button.Bind(wx.EVT_BUTTON, self.on_button_clicked)
            self.boss_button.append(button)
            if i % 4 == 3:
                posx = 69
                posy += 67
            else:
                posx += 72
        self.boss_image_show()

        # 关卡分数
        self.battle_label = []
        self.battle_choice = []
        posy = 255
        for i in range(len(battle_text)):
            self.battle_label.append((battle_text[i], 477, posy + 2))

            choices = []
            if i == 0:
                choices = battle_types
            elif 3 <= i <= 5:
                choices = yes_no_choice
            choice = wx.Choice(self, i + 20, choices=choices, pos=(643, posy), size=(130, 26))
            if i != 0 and i != 3:
                choice.Disable()
            if i == 3:
                choice.SetSelection(1)
            choice.SetFont(text_font)
            choice.Bind(wx.EVT_CHOICE, self.on_choice)
            self.battle_choice.append(choice)
            posy += 32

        self.confirm_button = wx.Button(self, wx.ID_ANY, label="添加", pos=(475, posy + 3), size=(300, 35))
        self.confirm_button.SetFont(bigger_text_font)
        self.confirm_button.Bind(wx.EVT_BUTTON, self.on_confirm)

        # 结算分数
        self.settlement_ctrl = wx.TextCtrl(self, value="0", pos=(670, 570), size=(90, 26), style=wx.TE_CENTER | wx.NO_BORDER)
        self.settlement_ctrl.SetFont(bigger_text_font)
        self.settlement_ctrl.SetBackgroundColour(fake_background)
        self.settlement_ctrl.SetForegroundColour("#808080")
        self.settlement_ctrl.Bind(wx.EVT_TEXT, self.on_text)
        self.settlement_ctrl.Bind(wx.EVT_CHAR, self.on_char)

        # 关卡分数一览
        self.list_ctrl = BattlePanel(self, wx.Rect(875, 260, 320, 530))

        self.calc_text = "0"
        self.calc_unit_text = "棕"
        self.show_hint = False
        self.hint_rect = wx.Rect(450, 640, 350, 145)

        self.Bind(wx.EVT_PAINT, self.on_paint)
        self.Refresh()

    def on_paint(self, event):
        dc = wx.PaintDC(self)
        dc.SetBrush(wx.TRANSPARENT_BRUSH)
        dc.SetPen(wx.Pen(outline_color, 2))
        dc.DrawBitmap(background_image, 0, 0)
        dc.DrawRoundedRectangle(40, 240, 350, 255, 20) # 挑战分数
        dc.DrawRoundedRectangle(40, 570, 350, 225, 20) # 结局分数
        dc.DrawRoundedRectangle(450, 240, 350, 295, 20) # 关卡分数
        dc.DrawRoundedRectangle(450, 640, 350, 155, 20) # 总得分
        dc.DrawRoundedRectangle(860, 240, 350, 555, 20) # 关卡分数一览
        dc.DrawRoundedRectangle(630, 563, 170, 40, 20) # 结算分数
        dc.DrawBitmap(self.settings_image, self.settings_rect.x, self.settings_rect.y)
        dc.DrawBitmap(self.information_image, self.information_rect.x, self.information_rect.y)
        dc.DrawBitmap(self.delete_image, self.delete_rect.x, self.delete_rect.y)

        dc.SetTextForeground(foreground_color)
        dc.SetFont(self.title_font)
        dc.DrawText("挑战分数", 40, 192)
        dc.DrawText("结局分数", 40, 522)
        dc.DrawText("关卡分数", 450, 192)
        dc.DrawText("结算分数", 450, 554)
        dc.DrawText("关卡分数一览", 860, 192)

        dc.SetTextForeground("#000000")
        dc.SetFont(self.text_font)
        for label in self.challenge_label:
            dc.DrawText(label[0], label[1], label[2])
        for label in self.battle_label:
            dc.DrawText(label[0], label[1], label[2])

        dc.SetBrush(wx.Brush("#DDDDDD"))
        dc.SetPen(wx.TRANSPARENT_PEN)

        x, y, w, h = self.list_ctrl.rect
        if self.list_ctrl.highlight != -1:
            liney = y + self.list_ctrl.highlight * 30 + 25
            dc.DrawRectangle(x, liney - 25, w, 25)

        if self.list_ctrl.true_highlight != -1:
            liney = y + self.list_ctrl.true_highlight * 30 + 25
            dc.DrawRectangle(x, liney - 25, w, 25)
            dc.SetPen(wx.Pen(foreground_color, 1))
            dc.DrawLine(x, liney, x + w, liney)

        dc.SetBrush(wx.TRANSPARENT_BRUSH)
        dc.SetPen(wx.Pen(foreground_color, 1))

        delty = 0
        for battle in self.list_ctrl.list:
            dc.DrawText(battle[0], x + 10, y + delty)
            dc.DrawText(battle[1], x + w - dc.GetTextExtent(battle[1]).GetWidth() - 10, y + delty)
            delty += 30

        if self.show_hint:
            dc.DrawText("长按重置", 465, 760)
            
        dc.SetFont(self.bold_text_font)
        dc.DrawText("总分！", 605, 675)

        dc.SetTextForeground(outline_color)
        dc.SetFont(self.final_font)
        w, h = dc.GetTextExtent(self.calc_text)
        x, y = 625 - w // 2, 725 - h // 2
        dc.DrawText(self.calc_text, x, y)
        if use_special_unit:
            dc.SetFont(self.final_unit_font)
            x, y = 627 + w // 2, 716
            dc.DrawText(unit, x, y)

    def init_challenge(self):
        for text_ctrl in self.challenge_text_ctrl:
            text_ctrl.Destroy()
        for choice in self.challenge_choice:
            choice.Destroy()
        self.challenge_text_ctrl.clear()
        self.challenge_choice.clear()
        self.challenge_label.clear()
        posy = 255
        for i in range(len(challenge_text)):
            self.challenge_label.append((challenge_text[i], 67, posy + 2))

            text_ctrl = wx.TextCtrl(self, value="0", pos=(313, posy), size=(50, 26), style=wx.TE_CENTER | wx.NO_BORDER)
            text_ctrl.SetFont(self.text_font)
            text_ctrl.SetBackgroundColour("#EFEFEF")
            text_ctrl.SetForegroundColour("#808080")
            text_ctrl.Bind(wx.EVT_TEXT, self.on_text)
            text_ctrl.Bind(wx.EVT_CHAR, self.on_char)
            self.challenge_text_ctrl.append(text_ctrl)

            posy += 32

        for i in range(len(unique_challenge_text)):
            self.challenge_label.append((unique_challenge_text[i], 67, posy + 2))

            choice = wx.Choice(self, wx.ID_ANY, choices=yes_no_choice, pos=(313, posy), size=(50, 26))
            choice.SetSelection(1)
            choice.SetFont(self.text_font)
            choice.Bind(wx.EVT_CHOICE, self.on_choice)
            self.challenge_choice.append(choice)

            posy += 32

    def on_text(self, event):
        text_ctrl = event.GetEventObject()
        value = text_ctrl.GetValue()
        if not value:
            text_ctrl.SetValue("0")
            text_ctrl.SetForegroundColour("#808080")
        else:
            if value == "0":
                text_ctrl.SetForegroundColour("#808080")
            else:
                text_ctrl.SetForegroundColour("#000000")
        self.calc()

    def on_char(self, event):
        text_ctrl = event.GetEventObject()
        current_value = text_ctrl.GetValue()
        new_char = chr(event.GetKeyCode())
        if new_char.isdigit():
            if current_value == "0":
                text_ctrl.SetValue(new_char)
                text_ctrl.SetInsertionPointEnd()
            elif len(current_value) < 5:
                event.Skip()
        elif event.GetKeyCode() in [wx.WXK_CONTROL_A, wx.WXK_BACK, wx.WXK_DELETE, wx.WXK_LEFT, wx.WXK_RIGHT, wx.WXK_UP, wx.WXK_DOWN, wx.WXK_HOME, wx.WXK_END, wx.WXK_TAB]:
            event.Skip()

    def on_choice(self, event):
        id = event.GetId()
        choice = event.GetEventObject()
        if id == 20:
            self.battle_choice[1].Clear()
            self.battle_choice[2].Clear()
            self.battle_choice[4].Clear()
            self.battle_choice[5].Clear()
            self.battle_choice[6].Clear()
            if choice.GetSelection() == 0:
                self.battle_choice[1].Enable()
                self.battle_choice[1].AppendItems(battle_levels)
                self.battle_choice[2].Disable()
                self.battle_choice[4].Enable()
                self.battle_choice[5].Enable()
                self.battle_choice[4].AppendItems(yes_no_choice)
                self.battle_choice[4].SetSelection(1)
                self.battle_choice[5].AppendItems(yes_no_choice)
                self.battle_choice[5].SetSelection(1)
                self.battle_choice[6].Disable()
            else:
                self.battle_choice[2].Enable()
                self.battle_choice[2].AppendItems(battle_special_names)
                self.battle_choice[1].Disable()
                self.battle_choice[4].Disable()
                self.battle_choice[5].Disable()
                self.battle_choice[6].Disable()
        elif id == 21:
            self.battle_choice[2].Enable()
            self.battle_choice[2].Clear()
            self.battle_choice[2].AppendItems(battle_names[self.battle_choice[1].GetSelection()])
            self.battle_choice[6].Disable()
        elif id == 22:
            self.battle_choice[6].Clear()
            name = self.battle_choice[2].GetStringSelection()
            if name in special_extra_title.keys():
                self.battle_choice[6].Enable()
                self.battle_choice[6].AppendItems(special_extra_title[name])
                self.battle_choice[6].SetSelection(0)

        self.calc()

    def on_button_clicked(self, event):
        button_id = event.GetId() - 100
        boss_selected[button_id] = 2 - boss_selected[button_id]
        if boss_selected[2] + boss_selected[3] + boss_selected[6] > 2:
            boss_selected[2] = 0
            boss_selected[3] = 0
            boss_selected[6] = 0
            boss_selected[button_id] = 2
        if button_id == 0 and boss_selected[0] != 0:
            boss_selected[4] = 0
        if button_id == 4 and boss_selected[4] != 0:
            boss_selected[0] = 0
        if button_id == 1 and boss_selected[5] != 0:
            boss_selected[5] = 0
        if button_id == 5 and boss_selected[1] != 0:
            boss_selected[1] = 0
        if boss_selected[0] + boss_selected[4] > 0 and boss_selected[8] == 0:
            if button_id == 8:
                boss_selected[0] = 0
                boss_selected[4] = 0
            else:
                boss_selected[8] = 2
        if boss_selected[1] + boss_selected[5] > 0 and boss_selected[7] == 0:
            if button_id == 7:
                boss_selected[1] = 0
                boss_selected[5] = 0
            else:
                boss_selected[7] = 2
        self.boss_image_show()
        self.calc()
    
    def on_confirm(self, event):
        battle_total = 0
        battle_name = self.battle_choice[2].GetStringSelection()
        if self.battle_choice[0].GetSelection() == 0:
            if battle_name in battle_score.keys():
                battle_total += battle_score[battle_name]
            if self.battle_choice[4].GetSelection() == 0:
                battle_total += 20
            times = 1.0
            if self.battle_choice[3].GetSelection() == 0:
                times += 0.2
            if self.battle_choice[5].GetSelection() == 0:
                times -= 0.7
            battle_total *= times
        elif self.battle_choice[0].GetSelection() == 1:
            battle_total = battle_special_score[battle_name][self.battle_choice[3].GetSelection()]
        else:
            return
        extra_item = self.battle_choice[6].GetStringSelection()
        if extra_item in special_extra_score.keys():
            battle_total += special_extra_score[extra_item]

        if battle_total > 0 and battle_name != "":
            print(f"新增战斗：{battle_name}，得分为{battle_total}")
            self.list_ctrl.add_item(battle_name, str(int(battle_total)), 
                                    (self.battle_choice[0].GetSelection(),
                                     self.battle_choice[3].GetSelection(),
                                     self.battle_choice[4].GetSelection(),
                                     self.battle_choice[5].GetSelection(),
                                     self.battle_choice[6].GetStringSelection()))
            self.calc()
    
    def on_delete(self):
        self.list_ctrl.delete_item()
        self.calc()

    def boss_image_show(self):
        width, height = 64, 64
        for i in range(len(boss_selected)):
            image = wx.Bitmap(width, height)
            dc = wx.MemoryDC(image)
            dc.DrawBitmap(wx.Bitmap(boss_images[i]), 0, 0)

            image = image.ConvertToImage()
            alpha = 85 * (boss_selected[i] + 1)
            if not image.HasAlpha():
                image.InitAlpha()
            for x in range(image.GetWidth()):
                for y in range(image.GetHeight()):
                    image.SetAlpha(x, y, alpha)
            image = wx.Bitmap(image)

            self.boss_button[i].SetBitmapLabel(image)
    
    def calc(self):
        total = int(self.settlement_ctrl.GetValue())
        for i in range(len(self.challenge_text_ctrl)):
            total += int(self.challenge_text_ctrl[i].GetValue()) * challenge_score[i]
        for i in range(len(self.challenge_choice)):
            if self.challenge_choice[i].GetSelection() == 0:
                total += unique_challenge_score[i]

        for i in range(len(boss_selected)):
            if boss_selected[i] == 2:
                total += boss_score[i]
        boss_cnt = 0
        for i in range(7):
            if boss_selected[i] == 2:
                boss_cnt += 1
        if boss_cnt == 3:
            total += three_ending
        if boss_cnt >= 2:
            total += two_ending
        if boss_selected[0] + boss_selected[4] >= 2 and boss_selected[1] + boss_selected[5] >= 2:
            total += both_three_four_ending

        total += self.list_ctrl.get_total_score()

        if not use_special_unit:
            self.calc_text = str(int(total))
        else:
            self.calc_text = f"{total * 1. / unit_score:.2f}"
        
        self.RefreshRect(wx.Rect(475, 600, 290, 200))
    
    def on_mouse_move(self, event):
        pos = event.GetPosition()
        x, y = pos

        if self.list_ctrl.rect.Contains(pos):
            delty = y - self.list_ctrl.rect.GetTop()
            if delty < len(self.list_ctrl.list) * 30:
                self.list_ctrl.update_highlight(math.floor(delty / 30))
            else:
                self.list_ctrl.update_highlight(-1)
        else:
                self.list_ctrl.update_highlight(-1)

        if self.hint_rect.Contains(pos):
            if not self.show_hint:
                self.show_hint = True
                self.RefreshRect(wx.Rect(457, 758, 200, 30))
        else:
            if self.show_hint:
                self.show_hint = False
                self.RefreshRect(wx.Rect(457, 758, 200, 30))
            self.mouse_is_down = False
            self.timer.Stop()

        event.Skip()
    
    def on_left_down(self, event):
        pos = event.GetPosition()

        if self.hint_rect.Contains(pos):
            self.mouse_is_down = True
            self.timer.Start(1000)

        event.Skip()

    def on_left_up(self, event):
        pos = event.GetPosition()

        if self.list_ctrl.rect.Contains(pos):
            self.list_ctrl.true_highlight = self.list_ctrl.highlight
            self.list_ctrl.refresh()
        elif self.settings_rect.Contains(pos):
            self.Parent.open_settings()
        elif self.information_rect.Contains(pos):
            self.Parent.open_information()
        elif self.delete_rect.Contains(pos):
            self.on_delete()

        self.mouse_is_down = False
        self.timer.Stop()
        event.Skip()
    
    def on_timer(self, event):
        if self.mouse_is_down:
            self.reset()
            self.calc()
        self.timer.Stop()
    
    def reset(self):
        for i in self.challenge_text_ctrl:
            i.SetValue("0")
        for i in self.challenge_choice:
            i.SetSelection(1)
        for i in range(len(boss_selected)):
            boss_selected[i] = 0
        self.settlement_ctrl.SetValue("0")
        self.list_ctrl.remove_all_items()
        self.boss_image_show()
    
    def on_settings_clicked(self, event):
        self.Parent.open_settings()
    
    def on_information_clicked(self, event):
        self.Parent.open_information()

class CalcFrame(wx.Frame):
    def __init__(self, parent, title):
        super(CalcFrame, self).__init__(parent, title=title, size=(1275, 900), style=wx.DEFAULT_FRAME_STYLE & ~(wx.RESIZE_BORDER | wx.MAXIMIZE_BOX))

        init_settings()
        self.SetIcon(wx.Icon(resource_path("images/巴别塔.ico")))
        self.SetBackgroundColour(fake_background)
        self.calc_panel = CalcPanel(self)
        self.settings_panel = SettingsPanel(self)
        self.information_panel = InformationPanel(self)
        self.Sizer = wx.BoxSizer(wx.VERTICAL)
        self.Sizer.Add(self.calc_panel, 1, wx.EXPAND)
    
    def open_settings(self):
        self.settings_panel.Show()
        self.calc_panel.Hide()
        self.Sizer.Add(self.settings_panel, 1, wx.EXPAND)
        self.Sizer.Remove(0)
        self.Layout()
    
    def close_settings(self, reset=False):
        self.calc_panel.Show()
        if reset:
            init_settings()
            self.calc_panel.init_challenge()
            self.calc_panel.list_ctrl.recalc()
        self.calc_panel.calc()
        self.settings_panel.Hide()
        self.Sizer.Remove(0)
        self.Sizer.Add(self.calc_panel, 1, wx.EXPAND)
        self.Layout()
    
    def open_information(self):
        self.information_panel.Show()
        self.calc_panel.Hide()
        self.Sizer.Remove(0)
        self.Sizer.Add(self.information_panel, 1, wx.EXPAND)
        self.Layout()
    
    def close_information(self):
        self.calc_panel.Show()
        self.information_panel.Hide()
        self.Sizer.Remove(0)
        self.Sizer.Add(self.calc_panel, 1, wx.EXPAND)
        self.Layout()

if __name__ == "__main__":
    app = wx.App(False)
    global background_image
    background_image = wx.Bitmap(resource_path("images/background.jpg"), wx.BITMAP_TYPE_ANY)
    window = CalcFrame(None, title_text + "正赛分数配置")
    window.Show()
    app.MainLoop()