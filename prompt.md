Implement the routes responsible to manage the API keys for this project i'm project.

The access_token from auth/login response is going to be used as a Bearer Token for those routes

Create a api-keys folder on src/ to store the controllers, services, modules and etc

# Database schema
```
api_keys
─────────────────────────────
id            UUID PK
user_id       UUID FK
key_hash      VARCHAR
created_at    TIMESTAMP
active         BOOLEAN
```

user_id is going to be related to user.id

# Instructions

### Generate API key route

- This route is going to be called /api-key and it's going to be a POST
- When called and authenticated, create the row on api_keys
- Return this JSON on the response
```
{
    "api_key": "api key here"
}
```

### Delete API key route
- This route is going to be called /api-key/ again but this time is going to be a DELETE
- When called and authenticated, soft delete the user current active api_key by changing the value of 'active' to false
- Return a message saying the api_key has been sucessfully deleted on the response JSON.