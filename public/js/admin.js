const deleteProduct = btn => {
    const prodID= btn.parentNode.querySelector('[name=productId]').value;
    const csrf= btn.parentNode.querySelector('[name=_csrf]').value;

    const productElement = btn.closest('article');

    fetch('/admin/products/' + prodID, {
        method: 'DELETE',
        headers: {
            'csrf-token': csrf
        }
    })
    .then(result => {
        productElement.parentNode.removeChild(productElement);
    })
    .catch(err => {
        console.log(err)
    })
}