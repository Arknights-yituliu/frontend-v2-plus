export { render };
// See https://vite-plugin-ssr.com/data-fetching
export const passToClient = ["pageProps", "urlPathname", "urlParsed", "theme"];

import { renderToString } from "@vue/server-renderer";
import { escapeInject, dangerouslySkipEscape } from "vite-plugin-ssr/server";
import { createVPSApp } from "./app";

async function render(pageContext) {
  // See https://vite-plugin-ssr.com/head
  const { documentProps } = pageContext.exports;
  const title = (documentProps && documentProps.title) || "明日方舟一图流";
  const desc = (documentProps && documentProps.description) || "明日方舟一图流";

  const { Page } = pageContext;
  let appHtml;
  if (Page) {
    const app = createVPSApp(pageContext, false);
    appHtml = await renderToString(app);
  } else {
    appHtml = `<div id="client_only" style="width: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; padding-top: 200px;">
                <img style="width: 128px;" src="/image/website/icon-large.webp" />
                <div style="font-size: 32px; font-weight: bold;  margin: 40px 0 10px 0;">${title}</div>
                <div style="font-size: 32px; ">加载中……</div>
              </div>`;
  }

  const documentHtml = escapeInject`<!DOCTYPE html>
    <html lang="en" class="${pageContext.theme}">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=0.68, maximum-scale=0.68, user-scalable=no" />
        <meta name="description" content="${desc}" />
        <meta name="keywords" content="素材获取,一图流,明日方舟,攒抽计算器,公招招募计算,基建排班生成器,刷图推荐,性价比,公开招募,掉率" />
        <title>${title}</title>
        <link rel="icon" type="image/x-icon" href="/favicon.ico">
        <link rel="stylesheet" href="https://cdn.staticfile.org/element-plus/2.3.2/index.min.css" />
        <link rel="stylesheet" href="https://cdn.staticfile.org/mdui/1.0.2/css/mdui.min.css" />
        __VITE_PLUGIN_SSR__ASSETS_FIRST__
        <script>
(function(self, undefined) {function CreateMethodProperty(e,r,t){var a={value:t,writable:!0,enumerable:!1,configurable:!0};Object.defineProperty(e,r,a)}function IsCallable(n){return"function"==typeof n}"use strict";var origSort=Array.prototype.sort;CreateMethodProperty(Array.prototype,"sort",function r(t){if(t!==undefined&&!1===IsCallable(t))throw new TypeError("The comparison function must be either a function or undefined");if(t===undefined)origSort.call(this);else{var e=Array.prototype.map.call(this,function(r,t){return{item:r,index:t}});origSort.call(e,function(r,e){var i=t.call(undefined,r.item,e.item);return 0===i?r.index-e.index:i});for(var i in e)Object.prototype.hasOwnProperty.call(e,i)&&e[i].item!==this[i]&&(this[i]=e[i].item)}return this});function ToObject(e){if(null===e||e===undefined)throw TypeError();return Object(e)}var Iterator=function(){var e=function(){return this.length=0,this},t=function(e){if("function"!=typeof e)throw new TypeError(e+" is not a function");return e},_=function(e,n){if(!(this instanceof _))return new _(e,n);Object.defineProperties(this,{__list__:{writable:!0,value:e},__context__:{writable:!0,value:n},__nextIndex__:{writable:!0,value:0}}),n&&(t(n.on),n.on("_add",this._onAdd.bind(this)),n.on("_delete",this._onDelete.bind(this)),n.on("_clear",this._onClear.bind(this)))};return Object.defineProperties(_.prototype,Object.assign({constructor:{value:_,configurable:!0,enumerable:!1,writable:!0},_next:{value:function(){var e;if(this.__list__)return this.__redo__&&(e=this.__redo__.shift())!==undefined?e:this.__nextIndex__<this.__list__.length?this.__nextIndex__++:void this._unBind()},configurable:!0,enumerable:!1,writable:!0},next:{value:function(){return this._createResult(this._next())},configurable:!0,enumerable:!1,writable:!0},_createResult:{value:function(e){return e===undefined?{done:!0,value:undefined}:{done:!1,value:this._resolve(e)}},configurable:!0,enumerable:!1,writable:!0},_resolve:{value:function(e){return this.__list__[e]},configurable:!0,enumerable:!1,writable:!0},_unBind:{value:function(){this.__list__=null,delete this.__redo__,this.__context__&&(this.__context__.off("_add",this._onAdd.bind(this)),this.__context__.off("_delete",this._onDelete.bind(this)),this.__context__.off("_clear",this._onClear.bind(this)),this.__context__=null)},configurable:!0,enumerable:!1,writable:!0},toString:{value:function(){return"[object Iterator]"},configurable:!0,enumerable:!1,writable:!0}},{_onAdd:{value:function(e){if(!(e>=this.__nextIndex__)){if(++this.__nextIndex__,!this.__redo__)return void Object.defineProperty(this,"__redo__",{value:[e],configurable:!0,enumerable:!1,writable:!1});this.__redo__.forEach(function(t,_){t>=e&&(this.__redo__[_]=++t)},this),this.__redo__.push(e)}},configurable:!0,enumerable:!1,writable:!0},_onDelete:{value:function(e){var t;e>=this.__nextIndex__||(--this.__nextIndex__,this.__redo__&&(t=this.__redo__.indexOf(e),-1!==t&&this.__redo__.splice(t,1),this.__redo__.forEach(function(t,_){t>e&&(this.__redo__[_]=--t)},this)))},configurable:!0,enumerable:!1,writable:!0},_onClear:{value:function(){this.__redo__&&e.call(this.__redo__),this.__nextIndex__=0},configurable:!0,enumerable:!1,writable:!0}})),Object.defineProperty(_.prototype,Symbol.iterator,{value:function(){return this},configurable:!0,enumerable:!1,writable:!0}),Object.defineProperty(_.prototype,Symbol.toStringTag,{value:"Iterator",configurable:!1,enumerable:!1,writable:!0}),_}();var ArrayIterator=function(){var e=function(t,r){if(!(this instanceof e))return new e(t,r);Iterator.call(this,t),r=r?String.prototype.includes.call(r,"key+value")?"key+value":String.prototype.includes.call(r,"key")?"key":"value":"value",Object.defineProperty(this,"__kind__",{value:r,configurable:!1,enumerable:!1,writable:!1})};return Object.setPrototypeOf&&Object.setPrototypeOf(e,Iterator.prototype),e.prototype=Object.create(Iterator.prototype,{constructor:{value:e,configurable:!0,enumerable:!1,writable:!0},_resolve:{value:function(e){return"value"===this.__kind__?this.__list__[e]:"key+value"===this.__kind__?[e,this.__list__[e]]:e},configurable:!0,enumerable:!1,writable:!0},toString:{value:function(){return"[object Array Iterator]"},configurable:!0,enumerable:!1,writable:!0}}),e}();"Symbol"in self&&"iterator"in Symbol&&"function"==typeof Array.prototype[Symbol.iterator]?CreateMethodProperty(Array.prototype,"values",Array.prototype[Symbol.iterator]):CreateMethodProperty(Array.prototype,"values",function r(){var r=ToObject(this);return new ArrayIterator(r,"value")});!function(){function e(e){return e&&e.Object==Object&&e}var t=e("object"==typeof c&&c),o=e("object"==typeof window&&window),b=e("object"==typeof self&&self),l=e("object"==typeof global&&global),c=t||o||b||l||Function("return this")();try{Object.defineProperty(c,"globalThis",{configurable:!0,enumerable:!1,writable:!0,value:c})}catch(n){c.globalThis=c}}();})('object' === typeof window && window || 'object' === typeof self && self || 'object' === typeof global && global || {});
        </script>
        <script defer src="https://cdn.staticfile.org/vue/3.2.47/vue.global.prod.min.js"></script>
        <script defer src="https://cdn.staticfile.org/element-plus/2.3.2/index.full.min.js"></script>
        <script defer src="https://cdn.staticfile.org/axios/1.3.4/axios.min.js"></script>
        <script defer src="https://cdn.staticfile.org/js-cookie/3.0.1/js.cookie.min.js"></script>
        <script defer src="https://cdn.staticfile.org/echarts/5.4.2/echarts.min.js"></script>
        <script defer src="https://cdn.staticfile.org/element-plus-icons-vue/2.1.0/index.iife.min.js"></script>
        <script defer src="https://cdn.staticfile.org/mdui/1.0.2/js/mdui.min.js"></script>
        
      </head>
      <body>
        <div id="app">${dangerouslySkipEscape(appHtml)}</div>
        <script>
/*! modernizr 3.6.0 (Custom Build) | MIT *
 * https://modernizr.com/download/?-webp-setclasses !*/
!function(e,n,A){function o(e,n){return typeof e===n}function t(){var e,n,A,t,a,i,l;for(var f in r)if(r.hasOwnProperty(f)){if(e=[],n=r[f],n.name&&(e.push(n.name.toLowerCase()),n.options&&n.options.aliases&&n.options.aliases.length))for(A=0;A<n.options.aliases.length;A++)e.push(n.options.aliases[A].toLowerCase());for(t=o(n.fn,"function")?n.fn():n.fn,a=0;a<e.length;a++)i=e[a],l=i.split("."),1===l.length?Modernizr[l[0]]=t:(!Modernizr[l[0]]||Modernizr[l[0]]instanceof Boolean||(Modernizr[l[0]]=new Boolean(Modernizr[l[0]])),Modernizr[l[0]][l[1]]=t),s.push((t?"":"no-")+l.join("-"))}}function a(e){var n=u.className,A=Modernizr._config.classPrefix||"";if(c&&(n=n.baseVal),Modernizr._config.enableJSClass){var o=new RegExp("(^|\\s)"+A+"no-js(\\s|$)");n=n.replace(o,"$1"+A+"js$2")}Modernizr._config.enableClasses&&(n+=" "+A+e.join(" "+A),c?u.className.baseVal=n:u.className=n)}function i(e,n){if("object"==typeof e)for(var A in e)f(e,A)&&i(A,e[A]);else{e=e.toLowerCase();var o=e.split("."),t=Modernizr[o[0]];if(2==o.length&&(t=t[o[1]]),"undefined"!=typeof t)return Modernizr;n="function"==typeof n?n():n,1==o.length?Modernizr[o[0]]=n:(!Modernizr[o[0]]||Modernizr[o[0]]instanceof Boolean||(Modernizr[o[0]]=new Boolean(Modernizr[o[0]])),Modernizr[o[0]][o[1]]=n),a([(n&&0!=n?"":"no-")+o.join("-")]),Modernizr._trigger(e,n)}return Modernizr}var s=[],r=[],l={_version:"3.6.0",_config:{classPrefix:"",enableClasses:!0,enableJSClass:!0,usePrefixes:!0},_q:[],on:function(e,n){var A=this;setTimeout(function(){n(A[e])},0)},addTest:function(e,n,A){r.push({name:e,fn:n,options:A})},addAsyncTest:function(e){r.push({name:null,fn:e})}},Modernizr=function(){};Modernizr.prototype=l,Modernizr=new Modernizr;var f,u=n.documentElement,c="svg"===u.nodeName.toLowerCase();!function(){var e={}.hasOwnProperty;f=o(e,"undefined")||o(e.call,"undefined")?function(e,n){return n in e&&o(e.constructor.prototype[n],"undefined")}:function(n,A){return e.call(n,A)}}(),l._l={},l.on=function(e,n){this._l[e]||(this._l[e]=[]),this._l[e].push(n),Modernizr.hasOwnProperty(e)&&setTimeout(function(){Modernizr._trigger(e,Modernizr[e])},0)},l._trigger=function(e,n){if(this._l[e]){var A=this._l[e];setTimeout(function(){var e,o;for(e=0;e<A.length;e++)(o=A[e])(n)},0),delete this._l[e]}},Modernizr._q.push(function(){l.addTest=i}),Modernizr.addAsyncTest(function(){function e(e,n,A){function o(n){var o=n&&"load"===n.type?1==t.width:!1,a="webp"===e;i(e,a&&o?new Boolean(o):o),A&&A(n)}var t=new Image;t.onerror=o,t.onload=o,t.src=n}var n=[{uri:"data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA=",name:"webp"},{uri:"data:image/webp;base64,UklGRkoAAABXRUJQVlA4WAoAAAAQAAAAAAAAAAAAQUxQSAwAAAABBxAR/Q9ERP8DAABWUDggGAAAADABAJ0BKgEAAQADADQlpAADcAD++/1QAA==",name:"webp.alpha"},{uri:"data:image/webp;base64,UklGRlIAAABXRUJQVlA4WAoAAAASAAAAAAAAAAAAQU5JTQYAAAD/////AABBTk1GJgAAAAAAAAAAAAAAAAAAAGQAAABWUDhMDQAAAC8AAAAQBxAREYiI/gcA",name:"webp.animation"},{uri:"data:image/webp;base64,UklGRh4AAABXRUJQVlA4TBEAAAAvAAAAAAfQ//73v/+BiOh/AAA=",name:"webp.lossless"}],A=n.shift();e(A.name,A.uri,function(A){if(A&&"load"===A.type)for(var o=0;o<n.length;o++)e(n[o].name,n[o].uri)})}),t(),a(s),delete l.addTest,delete l.addAsyncTest;for(var p=0;p<Modernizr._q.length;p++)Modernizr._q[p]();e.Modernizr=Modernizr}(window,document);
        </script>
      </body>
    </html>`;

  return {
    documentHtml,
    pageContext: {
      // We can add some `pageContext` here, which is useful if we want to do page redirection https://vite-plugin-ssr.com/page-redirection
    },
  };
}

//手机控制台调试库
{
  /*  <script src="https://cdn.bootcdn.net/ajax/libs/eruda/2.3.3/eruda.min.js"></script>
        <script>eruda.init()</script> */
}
