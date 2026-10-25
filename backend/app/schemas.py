from typing import Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class ApiModel(BaseModel):
   

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


# ---------- Uwierzytelnianie ----------

class LoginRequest(ApiModel):
    username: str
    password: str


class LoginResponse(ApiModel):
    access_token: str
    token_type: Literal["Bearer"] = "Bearer"
    expires_in: int  # czas ważności tokenu 


class PasswordChange(ApiModel):
    current_password: str
    new_password: str = Field(min_length=8)