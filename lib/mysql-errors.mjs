const failures={
 ECONNREFUSED:"MySQL connection refused. Check the service, private address and TCP port.",
 ETIMEDOUT:"MySQL connection timed out. Check the VPN/LAN route and scoped firewall rule.",
 ENOTFOUND:"MySQL hostname could not be resolved.",EAI_AGAIN:"MySQL hostname resolution temporarily failed.",
 ER_ACCESS_DENIED_ERROR:"MySQL authentication denied. Check the project account password and permitted client host.",
 ER_HOST_NOT_PRIVILEGED:"MySQL does not permit this client host. Check the project account host restriction.",
 ER_BAD_DB_ERROR:"Configured MySQL database does not exist. Ask the host operator to initialize it.",
 MYSQL_CONFIG_ERROR:"Invalid MySQL configuration. Check MYSQL_HOST/PORT/DATABASE and optional TLS settings.",
 HANDSHAKE_SSL_ERROR:"MySQL TLS negotiation failed. Check the server certificate and TLS configuration.",
 CERT_HAS_EXPIRED:"MySQL TLS certificate has expired.",ERR_TLS_CERT_ALTNAME_INVALID:"MySQL TLS certificate does not match MYSQL_HOST.",
 UNABLE_TO_VERIFY_LEAF_SIGNATURE:"MySQL TLS certificate is not trusted. Configure the correct CA.",
 SELF_SIGNED_CERT_IN_CHAIN:"MySQL TLS certificate is not trusted. Configure the correct CA.",
 DEPTH_ZERO_SELF_SIGNED_CERT:"MySQL TLS certificate is not trusted. Configure the correct CA."
};
export function mysqlConnectionFailure(error){
 const candidate=error?.errors?.[0]||error,code=candidate?.code;
 return {code:failures[code]?code:"MYSQL_ERROR",message:failures[code]||"MySQL operation failed. Check schema availability and database permissions."};
}
