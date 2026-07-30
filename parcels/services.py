import io
import logging

import qrcode
from django.core.files.base import ContentFile

from .models import Parcel

logger = logging.getLogger("delivery_hub.parcels.services")


def generate_qr_code(parcel: Parcel) -> None:
    """
    Generate a QR code for a parcel encoding its tracking ID.
    Saves the QR code image to the parcel's qr_code field.
    """
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=4,
    )
    qr.add_data(str(parcel.tracking_id))
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)

    parcel.qr_code.save(
        f"qr_{parcel.tracking_id}.png",
        ContentFile(buffer.read()),
        save=False,
    )
    parcel.save(update_fields=["qr_code"])
    logger.info("Generated QR code for parcel %s", parcel.tracking_id)


def decode_qr_image(image_file) -> str | None:
    """
    Decode a QR code from an uploaded image file.
    Returns the decoded tracking ID or None if no QR code is found.
    """
    try:
        from pyzbar.pyzbar import decode

        # Read the image
        image_data = image_file.read()
        decoded_objects = decode(image_data)

        if decoded_objects:
            return decoded_objects[0].data.decode("utf-8")
        return None
    except Exception as e:
        logger.error("Failed to decode QR image: %s", e)
        return None