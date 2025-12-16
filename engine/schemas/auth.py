from typing import Annotated

from pydantic import BaseModel, EmailStr, Field


class AuthRequest(BaseModel):
    email: Annotated[EmailStr, Field(description="User email")]
    password: Annotated[str, Field(description="User password")]
