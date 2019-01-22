const environments = {
    dev: {
      url: 'https://dev.col.plus',

      dataApi: 'https://api-dev.col.plus/',
      env: 'dev',
      MANAGEMENT_CLASSIFICATION: {
        key: 3,
        title: "CoL draft"
      }
    },
    prod: {
        url: 'https://wwww.col.plus',
        dataApi: 'https://api.col.plus/',
        env: 'prod',
        MANAGEMENT_CLASSIFICATION: {
            key: 3,
            title: "CoL draft"
          }
      }
  };
  
  const domain = window.location.hostname;

let env = environments.prod;
if (domain.endsWith('www.col.plus')) {
  env = environments.prod;
} else if (domain.endsWith('dev.col.plus')) {
  env = environments.dev;
}

  
  
  
  export default env;