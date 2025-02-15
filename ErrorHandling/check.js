async function sitaram() {
  //   return await new Promise((res, rej) =>
  //     setTimeout(() => res("राधे राधे"), 3000)
  //   ).catch(console.log);

  return await new Promise((res, rej) =>
    setTimeout(() => rej("राम राम"), 3000)
  ).catch((value) => {
    console.log(value);
    return "राधे राधे";
  });
}

const ram = sitaram();
ram.then(console.log);
