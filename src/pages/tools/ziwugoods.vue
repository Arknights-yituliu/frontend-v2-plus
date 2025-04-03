<template>
    <v-container>
      <h1>货物价格计算器</h1>
      
      <!-- 显示满赠明信片数量 -->
      <h3>满赠明信片数量：{{ giftPostcards }}</h3>
  
      <v-table>
        <thead>
          <tr>
            <th>货物名称</th>
            <th>单价 (¥)</th>
            <th>数量</th>
            <th>小计 (¥)</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, index) in flatItems" :key="index">
            <td>{{ item.name }}</td>
            <td>{{ item.price.toFixed(2) }}</td>
            <td>
              <v-text-field v-model.number="item.quantity" type="number" min="0"></v-text-field>
            </td>
            <td>{{ (item.price * item.quantity).toFixed(2) }}</td>
          </tr>
        </tbody>
      </v-table>
      
      <h2>总价: ¥{{ totalPrice.toFixed(2) }}</h2>
  
      <v-btn color="blue" @click="addOrder('支付宝')">支付宝付款</v-btn>
      <v-btn color="green" @click="addOrder('微信')">微信付款</v-btn>
      <v-btn color="red" @click="clearLocalStorage">清空 LocalStorage</v-btn>
      <v-btn color="green" @click="exportOrders">导出订单 JSON</v-btn>
      
      <h2>订单记录</h2>
      <v-table>
        <thead>
          <tr>
            <th>订单编号</th>
            <th>货物详情</th>
            <th>总价 (¥)</th>
            <th>付款方式</th>
            <th>时间</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(order, index) in orders" :key="index">
            <td>{{ index + 1 }}</td>
            <td>
              <ul>
                <li v-for="product in order.items" :key="product.name">
                  {{ product.name }} x {{ product.quantity }} (¥{{ product.total.toFixed(2) }})
                </li>
              </ul>
            </td>
            <td>{{ order.totalPrice.toFixed(2) }}</td>
            <td>{{ order.paymentMethod }}</td>
            <td>{{ order.timestamp }}</td>
          </tr>
        </tbody>
      </v-table>
    </v-container>
  </template>
  
  <script>
  import { ref, computed, onMounted } from 'vue';
  
  export default {
    setup() {
      const baseItems = [
        { name: "透卡-德克萨斯", price: 5.0 },
        { name: "透卡-拉普兰德", price: 5.0 },
        { name: "透卡-斥罪", price: 5.0 },
        { name: "透卡-伺夜", price: 5.0 },
        { name: "吧唧-德克萨斯", price: 12.0 },
        { name: "吧唧-拉普兰德", price: 12.0 },
        { name: "吧唧-斥罪", price: 12.0 },
        { name: "吧唧-伺夜", price: 12.0 },
        { name: "色纸-德克萨斯", price: 25.0 },
        { name: "色纸-拉普兰德", price: 25.0 },
        { name: "色纸-斥罪", price: 25.0 },
        { name: "色纸-伺夜", price: 25.0 },
        { name: "光栅卡-德克萨斯", price: 5.0 },
        { name: "光栅卡-拉普兰德", price: 5.0 },
        { name: "光栅卡-斥罪", price: 5.0 },
        { name: "光栅卡-伺夜", price: 5.0 },
        { name: "亚克力挂件-德克萨斯", price: 10.0 },
        { name: "亚克力挂件-拉普兰德", price: 10.0 },
        { name: "亚克力挂件-斥罪", price: 10.0 },
        { name: "亚克力挂件-伺夜", price: 10.0 },
        { name: "镭射票-德克萨斯", price: 3.0 },
        { name: "镭射票-拉普兰德", price: 3.0 },
        { name: "镭射票-斥罪", price: 3.0 },
        { name: "镭射票-伺夜", price: 3.0 },
        { name: "多肉斥罪拍立得", price: 5.0 },
        { name: "多肉斥罪明信片", price: 6.0 },
        { name: "贴纸包-阿施", price: 10.0 },
        { name: "满赠明信片-U-official满赠", price: 0.0 }
      ];
  
      const flatItems = ref(baseItems.map(item => ({
        ...item,
        quantity: 0
      })));
  
      const orders = ref([]);
  
      // 计算总价
      const totalPrice = computed(() =>
        flatItems.value.reduce((sum, item) => sum + (item.price * item.quantity), 0)
      );
  
      // 计算满赠明信片的数量
      const giftPostcards = computed(() => {
        const total = totalPrice.value;
        return Math.floor(total / 40);  // 每满40元赠送一个满赠明信片
      });
  
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
  
        // 清空已选择的数量
        flatItems.value.forEach(item => item.quantity = 0);
      }
  
      function loadOrders() {
        const savedOrders = localStorage.getItem("orders");
        if (savedOrders) {
          orders.value = JSON.parse(savedOrders);
        }
      }
  
      function clearLocalStorage() {
        localStorage.clear();
        flatItems.value.forEach(item => item.quantity = 0);
        orders.value = [];
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
  
      return { flatItems, orders, totalPrice, giftPostcards, addOrder, clearLocalStorage, exportOrders };
    }
  };
  </script>
  
  <style scoped>
    h1, h2 {
      text-align: center;
      margin-bottom: 20px;
    }
  </style>
  