1. 使用模块化的业务组装测试
	- 业务从测试用例抽离
	- 具体步骤：
		1. 用IDEA新建maven项目
		2. 修改pom.xml未指定的内容
		3. 右上角（或者右下角）点击 `Enable Auto-import`
		4. 在 `src/main/java` 新建Java Class（测试用例）
		5. 新建的测试用例中写三个方法：（需要testNg的注解）
			- `public void setUp`（@BeforeTest）
			- `public void tearDown`（@AfterTest）
			- `public void testXxx`（@Test）
		6. 在`src/main/java` 新建Java Class2（测试业务）
		7. 在新建的测试业务类中写业务的方法：
			- openUrl
			- changeLanguage
			- logIn
		8. 在新建的测试业务类中写`构造方法`
			```java
			public RanzhiCommon(WebDriver driver, String url){
              this.baseDriver = driver;
              this.baseUrl = url;
            }
            ```

2. 使用数据驱动测试
	- 测试数据从用例抽离
	- 常见的测试数据的形式：
		1. 外部文件（文本文件、Excel（带有格式，不容易读））
			- csv（默认是用"`,`"隔开每一列）
			- txt
		2. 数据库的方式
			- MySQL (轻便)
			- Oracle/ SQL Server
	- 具体进行数据驱动的方式：
		1. 找一个类，或者编写一个类
			- 找读取csv的类：maven的方式