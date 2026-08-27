---
title: Spring Boot 到底帮我干了多少活
date: 2026-08-26 10:00:00
categories:
  - java
tags:
  - Spring Boot
  - 入门
comments: true
cover: ""
---

如果你是从「老 Java Web」过来的，应该记得那些年配到吐的 XML、手动装 Tomcat、纠结依赖版本的日子。Spring Boot 出现之后，这些麻烦基本被它打包带走了。

它主要替你做了三件事：**自动装配、内嵌服务器、起步依赖**。

![Spring Boot 启动流程](/images/diagrams/spring-boot.svg)

## 三件事拆开说

- **自动装配**：你只要写一个 `@SpringBootApplication`，它其实是个「三合一」的注解，等于帮你开了配置、自动装配、组件扫描三个开关。
- **内嵌服务器**：以前要把项目塞进 Tomcat 才能跑，现在 Tomcat 被直接打包进你的 jar 里，`java -jar` 一下就能跑。
- **起步依赖**：想用 Redis？引一个 `spring-boot-starter-data-redis`，版本它都帮你配好，不用再自己到处找。

## 启动时它在干嘛

简单说就是：读到你引入了哪些东西 → 判断哪些该自动配 → 把该配的配好 → 把内嵌 Tomcat 拉起来。这就是为什么一个空项目也能直接访问。

## 小结

Spring Boot 不是魔法，它只是把「约定大于配置」做到了极致。你按它的约定来，就能少写一大半配置。