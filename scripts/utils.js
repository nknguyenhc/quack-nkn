async function submitJson(url, object) {
    return fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(object),
    }).then(res => res.json());
}

async function submitForm(url, object) {
    const formData = new FormData();
    for (const key of Object.keys(object)) {
        if (typeof object[key] === 'object') { // array
            for (const item of object[key]) {
                formData.append(key, item);
            }
        } else {
            formData.append(key, object[key]);
        }
    }
    return fetch(url, {
        method: "POST",
        body: formData,
    }).then(res => res.json());
}
