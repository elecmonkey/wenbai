# API 文档

所有接口基于 REST，默认返回 `application/json`，响应结构通常为：

```json
{
  "message": "success",
  "data": { ... }
}
```

发生错误时 `message` 为 `error`，`error` 字段包含提示信息。除特殊说明外，接口的运行环境为 Edge Runtime，日期/时间使用 ISO8601 字符串。

## 认证

### POST `/api/auth/login`

- **描述**：使用用户名、密码登录，成功时设置认证 Cookie。
- **请求体**：
  ```json
  {
    "username": "editor",
    "password": "******"
  }
  ```
- **成功响应**：
  ```json
  {
    "message": "success",
    "data": {
      "id": 1,
      "username": "editor",
      "displayName": "编辑同学"
    }
  }
  ```
- **错误状态**：`400` 缺少字段 · `401` 凭证错误。

### POST `/api/auth/logout`

- **描述**：清除认证 Cookie。
- **成功响应**：`{"message":"success"}`。

### GET `/api/auth/session`

- **描述**：查看当前登录用户信息。
- **成功响应**：
  ```json
  {
    "message": "success",
    "data": {
      "id": 1,
      "username": "editor",
      "displayName": "编辑同学"
    }
  }
  ```
  未登录时 `data` 为 `null`。

## 资料库（Repository）

### GET `/api/repos`
- **描述**：列出所有资料库。
- **成功响应**：`data` 为 `{ id, name }` 数组。

### POST `/api/repos`
- **权限**：需登录。
- **请求体**：`{ "name": "论语" }`
- **成功响应**：`201 Created`，`data.id` 为新建的资料库 ID。
- **错误状态**：`400` 缺少名称 · `409` 名称重复。

### PUT `/api/repos/:repoId`
- **权限**：需登录。
- **请求体**：`{ "name": "孟子" }`
- **错误状态**：`400` ID 非法或名称为空 · `404` 资料库不存在 · `409` 名称冲突。

### DELETE `/api/repos/:repoId`
- **权限**：需登录。
- **成功响应**：`{"message":"success","data":{"id":1}}`
- **错误状态**：`400` ID 非法 · `404` 资料库不存在。

## 记录（Record）

### GET `/api/repos/:repoId/records`
- **描述**：列出指定资料库内的记录。
- **成功响应**：`data` 为 `{ id, source, target, meta }` 数组。

### POST `/api/repos/:repoId/records`
- **权限**：需登录。
- **请求体**：`{ "source": "子曰：学而时习之" }`
- **成功响应**：`201 Created`，`data.id` 为新记录 ID。
- **错误状态**：`400` 缺少原文 · `404` 资料库不存在 · `409` 重复。

### GET `/api/repos/:repoId/records/:recordId`
- **描述**：获取记录详情，包括译文、元信息与分词对齐数据。
- **成功响应**：
  ```json
  {
    "message": "success",
    "data": {
      "id": 12,
      "source": "子曰：学而时习之",
      "target": "孔子说：要经常温习",
      "meta": "论语·学而",
      "source_tokens": [...],
      "target_tokens": [...],
      "alignment": [...]
    }
  }
  ```
- **错误状态**：`400` ID 非法 · `404` 记录不存在。

### PUT `/api/repos/:repoId/records/:recordId`
- **权限**：需登录。
- **请求体示例**：
  ```json
  {
    "data": {
      "source": "子曰：学而时习之",
      "target": "孔子说：经常学习",
      "meta": "论语·学而",
      "source_tokens": [
        { "id": 1, "word": "子", "pos": "名词", "syntax_role": "主语" }
      ],
      "target_tokens": [ ... ],
      "alignment": [ ... ]
    }
  }
  ```
- **错误状态**：`400` 缺少字段 · `401` 未登录 · `404` 记录不存在。

### DELETE `/api/repos/:repoId/records/:recordId`
- **权限**：需登录。
- **成功响应**：`{"message":"success","data":{"id":12}}`
- **错误状态**：`400` ID 非法 · `404` 记录不存在。
