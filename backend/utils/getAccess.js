const getAccess = (userId, resource, token = null) => {


  if (userId && resource.userId.equals(userId)) {
    return "owner";
  }


  if (userId) {
    const res = resource.sharedWith.find(
      (r) => r.userId.equals(userId)
    );

    if (res) {
      return res.permission;
    }
  }

  if (token && resource.shareLink?.token === token) {
    if (
      resource.shareLink.expiresAt &&
      resource.shareLink.expiresAt < new Date()
    ) {
      return null;
    }

    return resource.shareLink.permission;
  }

  return null;
};

export default getAccess;





