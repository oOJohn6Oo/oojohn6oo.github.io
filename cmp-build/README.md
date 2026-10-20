# CMP 构建控制台

静态 HTML/CSS/JavaScript，无打包依赖。在页面仓库根目录运行：

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

访问 http://127.0.0.1:8765/cmp-build/ 。

`credential-public-key.json` 保存发布公钥；对应私钥只配置在构建仓库的 `MAVEN_CREDENTIAL_PRIVATE_KEY` Secret 中。页面填写 Maven HTTPS URL、账号、密码，凭据加密后提交，不写入浏览器存储。

发布和 Debug 均调用 Supabase `submit-build`，无需填写 GitHub Token。函数入库后追加构建仓库的 `history.md`，由 push 触发 Actions。Debug 检查源码、版本及环境，跳过编译和发布。

重复点击和当前页面内的网络重试复用同一加密包，服务端识别重复提交。加密包仅保存在当前页面内存，刷新页面会开始新的提交。函数需允许 `https://oojohn6oo.github.io` 的 CORS 来源。

分支查询使用 GitCode 匿名接口。依赖 default/latest 在构建端解析；浏览器仅检查自定义版本的 metadata，不能据此保证平台兼容性。
