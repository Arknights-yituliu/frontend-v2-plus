<template>
    <v-container class="main-container">
        <!-- 顶部悬浮的总价 & 满赠信息 -->
        <v-app-bar color="primary" class="sticky-header" dense>
            <v-toolbar-title class="text-h5">总价: ¥{{ totalPrice.toFixed(0) }}</v-toolbar-title>
        </v-app-bar>

        <!-- 已选购商品列表 -->
        <div class="selected-items">
            <v-chip color="red" class="text-h6">满赠明信片: {{ giftPostcards }}</v-chip>
            <span v-for="(item, index) in selectedItems" :key="index">
                {{ item.name }} x{{ item.quantity }} <br />
            </span>
        </div>

        <!-- 操作按钮 -->
        <v-row class="button-row">
            <v-btn color="blue" @click="addOrder('支付宝')">支付宝付款</v-btn>
            <v-btn color="green" @click="addOrder('微信')">微信付款</v-btn>
            <v-btn color="purple" @click="clearCart">清空购物车</v-btn>
        </v-row>

        <!-- 购物表格，滚动区域 -->
        <div class="table-wrapper">
            <v-table class="custom-table">
                <thead>
                    <tr>
                        <th>货物名称</th>
                        <th>数量</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="(item, index) in flatItems" :key="index">
                        <td>
                            <!-- 尝试加载商品图片，若图片路径不存在则显示商品名称 -->
                            <img v-if="item.imagePath && isImageExists(item.imagePath)" :src="item.imagePath"
                                :alt="item.name" class="item-image" />
                            <span v-else>{{ item.name }}</span> {{ item.price.toFixed(0) }} × {{ item.quantity }} =
                            {{ (item.price * item.quantity).toFixed(0) }}
                        </td>
                        <td>
                            <!-- 数量选择，简化为 0, 1, 2，外加自定义输入框 -->
                            <v-btn-toggle v-model="item.quantity" mandatory class="quantity-toggle">
                                <v-btn v-for="n in [0, 1, 2]" :key="n" :value="n">{{ n }}</v-btn>
                            </v-btn-toggle>
                            <v-text-field v-model="item.quantity" type="number" min="0" max="5" step="1" hide-details
                                dense class="custom-input" label="数量" :value="item.quantity"></v-text-field>
                        </td>
                    </tr>
                </tbody>
            </v-table>
        </div>

        <!-- 已完成订单显示 -->
        <v-row class="button-row">
            <v-btn color="red" @click="clearLocalStorage">清空 LocalStorage</v-btn>
            <v-btn color="orange" @click="exportOrders">导出订单 JSON</v-btn>
        </v-row>
        <div v-if="orders.length > 0" class="order-history">
            <h3>已完成订单</h3>
            <v-list>
                <v-list-item-group v-for="(order, index) in orders" :key="index">
                    <v-list-item>
                        <v-list-item-content>
                            <v-list-item-title>支付方式: {{ order.paymentMethod }}</v-list-item-title>
                            <v-list-item-subtitle>
                                <div v-for="(item, idx) in order.items" :key="idx">
                                    {{ item.name }} x{{ item.quantity }} (¥{{ item.total }})
                                </div>
                            </v-list-item-subtitle>
                            <v-list-item-subtitle>总价: ¥{{ order.totalPrice.toFixed(0) }}</v-list-item-subtitle>
                            <v-list-item-subtitle>支付时间: {{ order.timestamp }}</v-list-item-subtitle>
                        </v-list-item-content>
                    </v-list-item>
                </v-list-item-group>
            </v-list>
        </div>
    </v-container>
</template>

<script>
import { ref, computed, onMounted } from 'vue';

export default {
    setup() {
        const baseItems = [
            { name: "透卡-德克萨斯", price: 5, imagePath: "public/image/ziwugoods/透卡-德克萨斯.png" },
            { name: "透卡-拉普兰德", price: 5, imagePath: "public/image/ziwugoods/透卡-拉普兰德.png" },
            { name: "透卡-斥罪", price: 5, imagePath: "public/image/ziwugoods/透卡-斥罪.png" },
            { name: "透卡-伺夜", price: 5, imagePath: "public/image/ziwugoods/透卡-伺夜.png" },
            { name: "吧唧-德克萨斯", price: 12, imagePath: "public/image/ziwugoods/吧唧-德克萨斯.png" },
            { name: "吧唧-拉普兰德", price: 12, imagePath: "public/image/ziwugoods/吧唧-拉普兰德.png" },
            { name: "吧唧-斥罪", price: 12, imagePath: "public/image/ziwugoods/吧唧-斥罪.png" },
            { name: "吧唧-伺夜", price: 12, imagePath: "public/image/ziwugoods/吧唧-伺夜.png" },
            { name: "色纸-斥罪", price: 25, imagePath: "public/image/ziwugoods/色纸-斥罪.png" },
            { name: "光栅卡-德克萨斯", price: 5, imagePath: "public/image/ziwugoods/光栅卡-德克萨斯.png" },
            { name: "光栅卡-拉普兰德", price: 5, imagePath: "public/image/ziwugoods/光栅卡-拉普兰德.png" },
            { name: "光栅卡-斥罪", price: 5, imagePath: "public/image/ziwugoods/光栅卡-斥罪.png" },
            { name: "光栅卡-伺夜", price: 5, imagePath: "public/image/ziwugoods/光栅卡-伺夜.png" },
            { name: "亚克力挂件-德克萨斯", price: 10, imagePath: "public/image/ziwugoods/亚克力挂件-德克萨斯.png" },
            { name: "亚克力挂件-拉普兰德", price: 10, imagePath: "public/image/ziwugoods/亚克力挂件-拉普兰德.png" },
            { name: "亚克力挂件-斥罪", price: 10, imagePath: "public/image/ziwugoods/亚克力挂件-斥罪.png" },
            { name: "亚克力挂件-伺夜", price: 10, imagePath: "public/image/ziwugoods/亚克力挂件-伺夜.png" },
            { name: "镭射票-A4行动组", price: 3, imagePath: "public/image/ziwugoods/镭射票-A4行动组.png" },
            { name: "镭射票-安塞尔", price: 3, imagePath: "public/image/ziwugoods/镭射票-安塞尔.png" },
            { name: "多肉斥罪拍立得", price: 5, imagePath: "public/image/ziwugoods/多肉斥罪拍立得.png" },
            { name: "多肉斥罪明信片", price: 6, imagePath: "public/image/ziwugoods/多肉斥罪明信片.png" },
            { name: "Q版贴纸包-阿施", price: 10, imagePath: "public/image/ziwugoods/Q版贴纸包-阿施.png" },
            { name: "满赠明信片", price: 0, imagePath: "public/image/ziwugoods/满赠明信片.png" },
            // 继续添加其他商品...
        ];

        const flatItems = ref(baseItems.map(item => ({ ...item, quantity: 0 })));
        const orders = ref([]);

        const totalPrice = computed(() =>
            flatItems.value.reduce((sum, item) => sum + (item.price * item.quantity), 0)
        );

        const giftPostcards = computed(() => Math.floor(totalPrice.value / 40));

        // 显示已选购商品
        const selectedItems = computed(() =>
            flatItems.value.filter(item => item.quantity > 0)
        );

        // 检查图片是否存在
        const isImageExists = (path) => {
            const img = new Image();
            img.src = path;
            return img.complete;
        };

        function addOrder(paymentMethod) {
            const orderItems = flatItems.value.filter(item => item.quantity > 0).map(item => ({
                name: item.name,
                quantity: item.quantity,
                total: item.price * item.quantity
            }));
            if (orderItems.length === 0) return;

            const newOrder = {
                items: orderItems,
                totalPrice: orderItems.reduce((sum, item) => sum + item.total, 0),
                paymentMethod,
                timestamp: new Date().toLocaleString()
            };
            orders.value.push(newOrder);
            localStorage.setItem("orders", JSON.stringify(orders.value));
            clearCart();
        }

        function loadOrders() {
            const savedOrders = localStorage.getItem("orders");
            if (savedOrders) {
                orders.value = JSON.parse(savedOrders);
            }
        }

        function clearLocalStorage() {
            localStorage.clear();
            clearCart();
            orders.value = [];
        }

        function clearCart() {
            flatItems.value.forEach(item => (item.quantity = 0));
        }

        function exportOrders() {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(orders.value, null, 2));
            const downloadAnchor = document.createElement("a");
            downloadAnchor.setAttribute("href", dataStr);
            downloadAnchor.setAttribute("download", "orders.json");
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            document.body.removeChild(downloadAnchor);
        }

        onMounted(loadOrders);

        return { flatItems, orders, totalPrice, giftPostcards, addOrder, clearLocalStorage, clearCart, exportOrders, selectedItems, isImageExists };
    }
};
</script>

<style scoped>
/* 让顶部总价 & 满赠信息固定 */
.sticky-header {
    position: fixed;
    top: 0;
    width: 100%;
    max-height: 60px;
    z-index: 1000;
    display: flex;
    align-items: center;
    padding: 10px;
    background-color: #1976D2;
}

/* 显示已选购商品 */
.selected-items {
    margin-top: 80px;
    padding: 10px;
    background-color: #f5f5f5;
    border-radius: 5px;
    font-size: 16px;
}

/* 让表格部分独立滚动 */
.table-wrapper {
    overflow-y: auto;
    max-height: calc(100vh - 220px);
}

/* 按钮区域 */
.button-row {
    margin-top: 20px;
    display: flex;
    gap: 20px;
}

/* 订单历史 */
.order-history {
    margin-top: 30px;
}

/* 自定义的商品图片样式 */
.item-image {
    max-width: 50px;
    max-height: 50px;
    margin-right: 10px;
}

/* 自定义输入框 */
.custom-input {
    width: 60px;
}
</style>