from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver
from rest_framework.authtoken.models import Token
from .models import DocumentRecord, DocumentVersion

from .key_utils import ensure_user_profile
receiver(post_save, sender=DocumentRecord)
def create_document_version(sender, instance, created, **kwargs):
    if not created:  # Only for updates, not new files
        DocumentVersion.objects.create(
            document=instance,
            content=instance.content,
            # ... handle file paths if applicable
        )


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_profile_with_keys(sender, instance, created, **kwargs):
    """Auto-create auth token and user profile (with RSA keys) for every new user."""
    if created:
        Token.objects.get_or_create(user=instance)
        ensure_user_profile(instance)
