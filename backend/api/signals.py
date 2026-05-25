from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver
from rest_framework.authtoken.models import Token
from .models import DocumentRecord, DocumentVersion

from .key_utils import ensure_user_profile

# DocumentRecord versions are created explicitly in `views.sign_document()` via `_upsert_document_chain()`.
# Keeping an additional DocumentRecord post_save signal that creates placeholder versions can
# interfere with the signing/verification pipeline.

@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_auth_token_and_profile(sender, instance=None, created=False, **kwargs):
    """Auto-create auth token and user profile (with RSA keys) for every new user."""
    if created:
        Token.objects.get_or_create(user=instance)
        ensure_user_profile(instance)
