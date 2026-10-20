# CMP 构建控制台

静态 HTML/CSS/JavaScript，无打包依赖。在页面仓库根目录运行：

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

访问 http://127.0.0.1:8765/cmp-build/ 。

`credential-public-key.json` 保存发布公钥；对应私钥只配置在构建仓库的 `MAVEN_CREDENTIAL_PRIVATE_KEY` Secret 中。页面填写 Maven HTTPS URL、账号、密码，凭据加密后提交，不写入浏览器存储。

临时 Debug 按钮使用本次输入的 GitHub Token 调用构建仓库 `debug.yml`，检查源码、版本及环境，跳过编译和发布。同一配置的网络重试复用请求号，已成功提交的配置直接返回运行链接。正式发布按钮暂未接入。

分支查询使用 GitCode 匿名接口。依赖 default/latest 在构建端解析；浏览器仅检查自定义版本的 metadata，不能据此保证平台兼容性。
