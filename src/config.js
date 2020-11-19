const environments = {
  dev: {
    url: "https://data.dev.catalogueoflife.org/",

    dataApi: "https://api.dev.catalogueoflife.org/",
    downloadApi: "http://download.dev.catalogueoflife.org/",
    env: "dev",
    kibanaEnv: {
      index: "198317e0-29a0-11eb-9ca0-ddc1af98892f",
    },
    MANAGEMENT_CLASSIFICATION: {
      key: 3,
      title: "COL draft",
      origin: "managed",
    },

    gitBackend: "https://github.com/CatalogueOfLife/backend/tree/",
    gitFrontend: "https://github.com/CatalogueOfLife/checklistbank/tree/",
    syncStateHeartbeat: 3000,
  },
  prod: {
    url: "https://data.catalogue.life/",
    dataApi: "https://api.catalogue.life/",

    downloadApi: "https://download.catalogue.life/",
    env: "prod",
    kibanaEnv: {
      index: "37c669c0-2a5c-11eb-9ca0-ddc1af98892f",
    },
    MANAGEMENT_CLASSIFICATION: {
      key: 3,
      title: "COL draft",
      origin: "managed",
    },

    gitBackend: "https://github.com/CatalogueOfLife/backend/tree/",
    gitFrontend: "https://github.com/CatalogueOfLife/checklistbank/tree/",
    syncStateHeartbeat: 3000,
  },
  docker: {
    url: "http://localhost:3000",
    dataApi: "http://localhost:8090/",
    env: "docker",
    kibanaEnv: { name: "col-docker", index: "AWyLa4mQHCKcR6PFXu4X" },
    MANAGEMENT_CLASSIFICATION: {
      key: 3,
      title: "COL draft",
      origin: "managed",
    },

    gitBackend: "https://github.com/CatalogueOfLife/backend/tree/",
    gitFrontend: "https://github.com/CatalogueOfLife/checklistbank/tree/",
    syncStateHeartbeat: 3000,
  },
  local: {
    url: "http://localhost:3000",
    dataApi: "http://localhost:8080/",
    env: "local",
    kibanaEnv: { name: "col-local", index: "AWyLa4mQHCKcR6PFXu4X" },
    MANAGEMENT_CLASSIFICATION: {
      key: 3,
      title: "COL draft",
      origin: "managed",
    },
    gitBackend: "https://github.com/CatalogueOfLife/backend/tree/",
    gitFrontend: "https://github.com/CatalogueOfLife/checklistbank/tree/",
    syncStateHeartbeat: 3000,
  },
};

const domain = window.location.hostname;

let env = environments.dev;
if (domain.endsWith("data.catalogue.life")) {
  env = environments.prod;
} else if (domain.endsWith("localhost")) {
  env = environments.dev;
} else {
  env = environments.dev;
}

export default env;
