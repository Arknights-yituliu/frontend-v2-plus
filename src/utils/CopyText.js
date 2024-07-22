function copyTextToClipboard(text, callback) {

    if (navigator.clipboard && window.isSecureContext) { // 现代浏览器支持

        navigator.clipboard.writeText(text)

            .then(() => {

                if(callback) callback(true);

            })

            .catch(err => {

                if(callback) callback(false);

                console.error('Async: Could not copy text: ', err);

            });

    } else if (document.queryCommandSupported && document.queryCommandSupported("copy")) { // 旧版浏览器支持

        const textarea = document.createElement("textarea");

        textarea.textContent = text;

        textarea.style.position = "fixed"; // 防止影响页面布局

        document.body.appendChild(textarea);

        textarea.select();

        try {

            const result = document.execCommand("copy");

            if(callback) callback(result);

        } catch (err) {

            if(callback) callback(false);

            console.error('Sync: Could not copy text: ', err);

        }

        document.body.removeChild(textarea);

    } else {

        console.error("该浏览器不支持点击复制到剪贴板功能。");

        if(callback) callback(false);

    }

}

export {
    copyTextToClipboard
}