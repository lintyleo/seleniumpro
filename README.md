#Pro Selenium

a repository to build selenium solution continously

该项目为 Selenium 自动化测试的入门项目

> 使用要求，Firefox 46.0（含） 以下版本，目前 基于 Selenium 2

具体配置如下：

- 浏览器： Firefox 46.0（含） 以下版本
- Java： JDK 1.8 / JetBrains IDEA Community Edition 
- Python： 3.4+ / JetBrains PyCharm Community Edition
- Selenium: 2.53 (Java: 2.53.1 / Python: 2.53.6)

项目使用了开源版 然之协同系统作为示例: https://www.ranzhico.com/



目录结构如下：

1. HelloSelenium: Java的Selenium入门项目
- 使用了`Maven`统一管理Selenium的包引用
- 使用Jetbrains IDEA作为编程工具使用
- 使用`TestNG`作为测试框架
2. HelloPySelenium：Python的Selenium入门项目
- 使用了`Python3`
- 使用Jetbrains PyCharm作为编程工具
- 使用`unittest`作为测试框架
3. FrameSelemium: Java的Selenium进阶项目
- 使用了`业务模块化`处理测试业务需求
- 使用了`csv`文件处理测试用例的数据
4. FramePySelemium：Python的Selenium进阶项目
- 对应了上述`Java`项目
- 使用了`业务模块化`处理测试业务需求
- 使用了`csv`文件处理测试用例的数据
5. SealSelenium: Java的Selenium封装项目
   - 使用了 BoxDriver 封装 Selenium WebDriver
   - 使用的 ExtentReport 进行测试报告输出
6. SealPySelenium: Python的Selenium封装项目
   - 对应了上述 5 Java 项目
   - 使用了修改后的 html_test_runner 进行测试报输出




