import { m } from '@/paraglide/messages.js';
import type { ImageUploaderCopy } from '@/components/image-uploader';

export function getImageUploaderCopy(): ImageUploaderCopy {
  return {
    dropToUpload: m['common.upload.drop'](),
    previewAlt: m['common.upload.preview_alt'](),
    replaceImage: m['common.upload.replace'](),
    uploading: m['common.upload.uploading'](),
    failed: m['common.upload.failed'](),
    removeImage: m['common.upload.remove'](),
    upload: m['common.upload.action'](),
    maxSize: (size) => m['common.upload.max_size']({ size }),
    onlyImages: m['common.upload.only_images'](),
    notAnImage: (fileName) => m['common.upload.not_image']({ fileName }),
    exceedsLimit: (fileName, size) =>
      m['common.upload.too_large']({ fileName, size }),
    onlyFirstImages: (count) => m['common.upload.only_first']({ count }),
  };
}
